import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Weapon } from './weapon.entity.js';
import { WeaponsController } from './weapons.controller.js';
import { WeaponsService } from './weapons.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Weapon])],
  controllers: [WeaponsController],
  providers: [WeaponsService],
  exports: [WeaponsService],
})
export class WeaponsModule {}
