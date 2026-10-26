import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Subject } from 'rxjs';
import { Repository } from 'typeorm';
import { PlayersService } from '../players/players.service.js';
import type {
  CreateQuestDto,
  QuestStatusDto,
  QuestUpdate,
} from './dto/quest.dto.js';
import { Quest, type QuestEventType, QuestProgress } from './quest.entity.js';

export interface PlayerQuestUpdates {
  playerId: string;
  updates: QuestUpdate[];
}

@Injectable()
export class QuestsService {
  /** Every progress change, so the gateway can push it to the player's socket. */
  readonly updates$ = new Subject<PlayerQuestUpdates>();

  constructor(
    @InjectRepository(Quest) private readonly quests: Repository<Quest>,
    @InjectRepository(QuestProgress)
    private readonly progress: Repository<QuestProgress>,
    private readonly players: PlayersService,
  ) {}

  async create(dto: CreateQuestDto): Promise<Quest> {
    if (await this.quests.existsBy({ code: dto.code })) {
      throw new ConflictException(`Quest ${dto.code} already exists`);
    }
    return this.quests.save(this.quests.create(dto));
  }

  async listForPlayer(playerId: string): Promise<QuestStatusDto[]> {
    const [quests, rows] = await Promise.all([
      this.quests.find({ where: { active: true }, order: { code: 'ASC' } }),
      this.progress.findBy({ playerId }),
    ]);
    const byQuest = new Map(rows.map((row) => [row.questId, row]));
    return quests.map((quest) => toStatus(quest, byQuest.get(quest.id)));
  }

  /**
   * Advances every active quest listening to `type`. Completed quests are left untouched,
   * so replaying an event after completion never double-awards XP.
   */
  async applyEvent(
    playerId: string,
    type: QuestEventType,
    amount = 1,
  ): Promise<QuestUpdate[]> {
    const quests = await this.quests.findBy({ eventType: type, active: true });
    const updates: QuestUpdate[] = [];

    for (const quest of quests) {
      const row =
        (await this.progress.findOneBy({ playerId, questId: quest.id })) ??
        this.progress.create({
          playerId,
          questId: quest.id,
          progress: 0,
          completed: false,
        });
      if (row.completed) continue;

      row.progress = Math.min(quest.target, row.progress + amount);
      row.completed = row.progress >= quest.target;
      await this.progress.save(row);

      if (row.completed) await this.players.addXp(playerId, quest.rewardXp);
      updates.push(
        Object.assign(toStatus(quest, row), { justCompleted: row.completed }),
      );
    }

    if (updates.length > 0) this.updates$.next({ playerId, updates });
    return updates;
  }
}

function toStatus(quest: Quest, row?: QuestProgress): QuestStatusDto {
  return {
    code: quest.code,
    title: quest.title,
    eventType: quest.eventType,
    target: quest.target,
    progress: row?.progress ?? 0,
    completed: row?.completed ?? false,
    rewardXp: quest.rewardXp,
  };
}
