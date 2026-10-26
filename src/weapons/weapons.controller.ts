import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard, Roles } from '../common/auth.js';
import { CreateWeaponDto, UpdateWeaponDto } from './dto/weapon.dto.js';
import { Weapon } from './weapon.entity.js';
import { WeaponsService } from './weapons.service.js';

@ApiTags('weapons')
@Controller('weapons')
export class WeaponsController {
  constructor(private readonly weapons: WeaponsService) {}

  /** Public: the game client fetches the live catalog on boot. */
  @Get()
  list(): Promise<Weapon[]> {
    return this.weapons.list();
  }

  @Get('all')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Roles('admin')
  listAll(): Promise<Weapon[]> {
    return this.weapons.list(true);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Roles('admin')
  create(@Body() dto: CreateWeaponDto): Promise<Weapon> {
    return this.weapons.create(dto);
  }

  /** Live-ops balancing: change damage, fire rate, etc. without shipping a new build. */
  @Patch(':slug')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Roles('admin')
  update(
    @Param('slug') slug: string,
    @Body() dto: UpdateWeaponDto,
  ): Promise<Weapon> {
    return this.weapons.update(slug, dto);
  }
}
