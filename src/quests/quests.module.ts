import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayersModule } from '../players/players.module.js';
import { Quest, QuestProgress } from './quest.entity.js';
import { QuestsController } from './quests.controller.js';
import { QuestsGateway } from './quests.gateway.js';
import { QuestsService } from './quests.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Quest, QuestProgress]), PlayersModule],
  controllers: [QuestsController],
  providers: [QuestsService, QuestsGateway],
  exports: [QuestsService],
})
export class QuestsModule {}
