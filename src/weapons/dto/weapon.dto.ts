import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateWeaponDto {
  @ApiProperty({ example: 'smg-viper' })
  @IsString()
  @Length(2, 48)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase letters, digits or -',
  })
  slug: string;

  @ApiProperty({ example: 'Viper SMG' })
  @IsString()
  @Length(2, 64)
  name: string;

  @ApiProperty({ example: 18 })
  @IsInt()
  @Min(1)
  @Max(1000)
  damage: number;

  @ApiProperty({ example: 12.5, description: 'Shots per second' })
  @IsNumber()
  @Min(0.1)
  @Max(100)
  fireRate: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  @Max(500)
  magazineSize: number;

  @ApiProperty({ example: 1.8, description: 'Seconds' })
  @IsNumber()
  @Min(0)
  @Max(30)
  reloadTime: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateWeaponDto extends PartialType(CreateWeaponDto) {}
