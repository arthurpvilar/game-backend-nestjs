import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuard } from '../common/auth.js';
import { Player } from '../players/player.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

/** Global so every module can use {@link AuthGuard} and the shared JwtService. */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Player]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '1d') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService, AuthGuard, JwtModule],
})
export class AuthModule {}
