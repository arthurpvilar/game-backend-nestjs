import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchParticipant } from '../matches/match-participant.entity.js';
import { Player } from './player.entity.js';
import { PlayersController } from './players.controller.js';
import { PlayersService } from './players.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Player, MatchParticipant])],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService, TypeOrmModule],
})
export class PlayersModule {}
