import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestsModule } from '../quests/quests.module.js';
import { MatchParticipant } from './match-participant.entity.js';
import { Match } from './match.entity.js';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Match, MatchParticipant]), QuestsModule],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
