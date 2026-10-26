import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  AuthGuard,
  type AuthUser,
  CurrentUser,
  Roles,
} from '../common/auth.js';
import { CreateQuestDto, QuestStatusDto } from './dto/quest.dto.js';
import { Quest } from './quest.entity.js';
import { QuestsService } from './quests.service.js';

@ApiTags('quests')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('quests')
export class QuestsController {
  constructor(private readonly quests: QuestsService) {}

  @Get('me')
  @ApiOkResponse({ type: [QuestStatusDto] })
  mine(@CurrentUser() user: AuthUser): Promise<QuestStatusDto[]> {
    return this.quests.listForPlayer(user.id);
  }

  @Post()
  @Roles('admin')
  create(@Body() dto: CreateQuestDto): Promise<Quest> {
    return this.quests.create(dto);
  }
}
