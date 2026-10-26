import { Test } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Match } from '../matches/match.entity.js';
import { MatchParticipant } from '../matches/match-participant.entity.js';
import { Player } from '../players/player.entity.js';
import { PlayersService } from '../players/players.service.js';
import { Quest, QuestProgress } from './quest.entity.js';
import { type PlayerQuestUpdates, QuestsService } from './quests.service.js';

describe('QuestsService', () => {
  let service: QuestsService;
  let players: Repository<Player>;
  let quests: Repository<Quest>;
  let playerId: string;
  let pushed: PlayerQuestUpdates[];

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqljs',
          synchronize: true,
          entities: [Player, Quest, QuestProgress, Match, MatchParticipant],
        }),
        TypeOrmModule.forFeature([
          Player,
          Quest,
          QuestProgress,
          MatchParticipant,
        ]),
      ],
      providers: [QuestsService, PlayersService],
    }).compile();

    service = moduleRef.get(QuestsService);
    players = moduleRef.get(getRepositoryToken(Player));
    quests = moduleRef.get(getRepositoryToken(Quest));

    playerId = (
      await players.save(
        players.create({ username: 'tester', passwordHash: 'x' }),
      )
    ).id;
    await quests.save([
      quests.create({
        code: 'kills-5',
        title: '5 kills',
        eventType: 'kill',
        target: 5,
        rewardXp: 100,
      }),
      quests.create({
        code: 'kills-2',
        title: '2 kills',
        eventType: 'kill',
        target: 2,
        rewardXp: 20,
      }),
      quests.create({
        code: 'retired',
        title: 'Old',
        eventType: 'kill',
        target: 1,
        rewardXp: 999,
        active: false,
      }),
      quests.create({
        code: 'win-1',
        title: 'Win',
        eventType: 'match_won',
        target: 1,
        rewardXp: 50,
      }),
    ]);

    pushed = [];
    service.updates$.subscribe((update) => pushed.push(update));
  });

  const xp = async () => (await players.findOneByOrFail({ id: playerId })).xp;

  it('advances every active quest listening to the event and ignores inactive ones', async () => {
    const updates = await service.applyEvent(playerId, 'kill', 1);

    expect(updates.map((u) => [u.code, u.progress])).toEqual(
      expect.arrayContaining([
        ['kills-5', 1],
        ['kills-2', 1],
      ]),
    );
    expect(updates.find((u) => u.code === 'retired')).toBeUndefined();
  });

  it('clamps progress at the target and awards XP exactly once', async () => {
    await service.applyEvent(playerId, 'kill', 4);
    const crossing = await service.applyEvent(playerId, 'kill', 4);

    expect(crossing.find((u) => u.code === 'kills-5')).toMatchObject({
      progress: 5,
      completed: true,
      justCompleted: true,
    });
    expect(await xp()).toBe(120); // kills-2 (20) completed on the first event, kills-5 (100) now

    const replay = await service.applyEvent(playerId, 'kill', 10);
    expect(replay).toEqual([]);
    expect(await xp()).toBe(120);
  });

  it('pushes updates for the gateway only when something changed', async () => {
    await service.applyEvent(playerId, 'match_won');
    await service.applyEvent(playerId, 'match_won');

    expect(pushed).toHaveLength(1);
    expect(pushed[0]).toMatchObject({
      playerId,
      updates: [{ code: 'win-1', justCompleted: true }],
    });
  });

  it('lists every active quest with the player progress, including untouched ones', async () => {
    await service.applyEvent(playerId, 'kill', 1);

    const list = await service.listForPlayer(playerId);
    expect(list.map((q) => [q.code, q.progress, q.completed])).toEqual([
      ['kills-2', 1, false],
      ['kills-5', 1, false],
      ['win-1', 0, false],
    ]);
  });
});
