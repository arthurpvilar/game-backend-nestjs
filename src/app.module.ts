import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health/health.controller.js';
import { MatchesModule } from './matches/matches.module.js';
import { PlayersModule } from './players/players.module.js';
import { QuestsModule } from './quests/quests.module.js';
import { WeaponsModule } from './weapons/weapons.module.js';

export function databaseOptions(config: ConfigService): TypeOrmModuleOptions {
  const common = {
    autoLoadEntities: true,
    // Opt-in (docker-compose and tests enable it); production should run migrations instead.
    synchronize: config.get('DB_SYNC') === 'true',
  };
  if (config.get('DB_TYPE') === 'sqljs') {
    return { ...common, type: 'sqljs', autoSave: false };
  }
  return {
    ...common,
    type: 'postgres',
    url: config.getOrThrow<string>('DATABASE_URL'),
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseOptions,
    }),
    AuthModule,
    PlayersModule,
    WeaponsModule,
    QuestsModule,
    MatchesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
