import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ParticipantResultDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  playerId: string;

  @ApiProperty({ example: 'guards' })
  @IsString()
  @Length(1, 16)
  team: string;

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(0)
  @Max(10_000)
  kills: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  @Max(10_000)
  deaths: number;

  @ApiProperty({ example: 1450 })
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  score: number;
}

export class ReportMatchDto {
  @ApiProperty({ example: 'ranked' })
  @IsString()
  @Length(1, 32)
  mode: string;

  @ApiProperty({ example: 'harbor' })
  @IsString()
  @Length(1, 48)
  map: string;

  @ApiProperty({ example: 612 })
  @IsInt()
  @Min(0)
  @Max(86_400)
  durationSeconds: number;

  @ApiProperty({
    example: 'guards',
    required: false,
    nullable: true,
    description: 'Omit on a draw',
  })
  @IsOptional()
  @IsString()
  @Length(1, 16)
  winnerTeam?: string;

  @ApiProperty({ type: [ParticipantResultDto] })
  @ValidateNested({ each: true })
  @Type(() => ParticipantResultDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(128)
  participants: ParticipantResultDto[];
}
