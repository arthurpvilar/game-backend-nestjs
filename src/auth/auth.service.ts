import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { type Role, toJwtPayload } from '../common/auth.js';
import { Player } from '../players/player.entity.js';
import type { AuthResponseDto, CredentialsDto } from './dto/credentials.dto.js';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Player) private readonly players: Repository<Player>,
    private readonly jwt: JwtService,
  ) {}

  /** Public sign-up always creates a `player`; privileged accounts come from the seed script. */
  async register(
    dto: CredentialsDto,
    role: Role = 'player',
  ): Promise<AuthResponseDto> {
    if (await this.players.existsBy({ username: dto.username })) {
      throw new ConflictException('Username already taken');
    }
    const player = await this.players.save(
      this.players.create({
        username: dto.username,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        role,
      }),
    );
    return this.issueToken(player);
  }

  async login(dto: CredentialsDto): Promise<AuthResponseDto> {
    const player = await this.players.findOne({
      where: { username: dto.username },
      select: { id: true, username: true, role: true, passwordHash: true },
    });
    // Same error for unknown user and wrong password, so usernames can't be probed.
    if (!player || !(await bcrypt.compare(dto.password, player.passwordHash))) {
      throw new UnauthorizedException('Invalid username or password');
    }
    return this.issueToken(player);
  }

  private async issueToken(player: Player): Promise<AuthResponseDto> {
    const user = {
      id: player.id,
      username: player.username,
      role: player.role,
    };
    return {
      accessToken: await this.jwt.signAsync(toJwtPayload(user)),
      player: user,
    };
  }
}
