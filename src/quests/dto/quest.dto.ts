import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { QUEST_EVENTS, type QuestEventType } from '../quest.entity.js';

export class CreateQuestDto {
  @ApiProperty({ example: 'daily-10-kills' })
  @IsString()
  @Length(2, 48)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'code must be lowercase letters, digits or -',
  })
  code: string;

  @ApiProperty({ example: 'Get 10 eliminations' })
  @IsString()
  @Length(2, 96)
  title: string;

  @ApiProperty({ enum: QUEST_EVENTS })
  @IsIn(QUEST_EVENTS)
  eventType: QuestEventType;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  @Max(100_000)
  target: number;

  @ApiProperty({ example: 150 })
  @IsInt()
  @Min(0)
  @Max(100_000)
  rewardXp: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/** Sent by an authoritative game server over the `/quests` socket. */
export class QuestEventDto {
  @IsUUID()
  playerId: string;

  @IsIn(QUEST_EVENTS)
  type: QuestEventType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  amount?: number;
}

export class QuestStatusDto {
  @ApiProperty() code: string;
  @ApiProperty() title: string;
  @ApiProperty({ enum: QUEST_EVENTS }) eventType: QuestEventType;
  @ApiProperty() target: number;
  @ApiProperty() progress: number;
  @ApiProperty() completed: boolean;
  @ApiProperty() rewardXp: number;
}

export interface QuestUpdate extends QuestStatusDto {
  /** True only on the event that crossed the target. */
  justCompleted: boolean;
}
