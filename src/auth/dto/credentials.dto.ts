import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class CredentialsDto {
  @ApiProperty({
    example: 'ghost_runner',
    description: '3-32 chars: letters, digits, _ or -',
  })
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'username may only contain letters, digits, _ or -',
  })
  username: string;

  @ApiProperty({ example: 'correct-horse-battery', minLength: 8 })
  @IsString()
  @Length(8, 72)
  password: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({
    example: { id: 'uuid', username: 'ghost_runner', role: 'player' },
  })
  player: { id: string; username: string; role: string };
}
