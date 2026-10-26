import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateWeaponDto, UpdateWeaponDto } from './dto/weapon.dto.js';
import { Weapon } from './weapon.entity.js';

@Injectable()
export class WeaponsService {
  constructor(
    @InjectRepository(Weapon) private readonly weapons: Repository<Weapon>,
  ) {}

  list(includeDisabled = false): Promise<Weapon[]> {
    return this.weapons.find({
      where: includeDisabled ? {} : { enabled: true },
      order: { slug: 'ASC' },
    });
  }

  async create(dto: CreateWeaponDto): Promise<Weapon> {
    if (await this.weapons.existsBy({ slug: dto.slug })) {
      throw new ConflictException(`Weapon ${dto.slug} already exists`);
    }
    return this.weapons.save(this.weapons.create(dto));
  }

  async update(slug: string, dto: UpdateWeaponDto): Promise<Weapon> {
    const weapon = await this.weapons.findOneBy({ slug });
    if (!weapon) throw new NotFoundException(`Weapon ${slug} not found`);
    if (
      dto.slug &&
      dto.slug !== slug &&
      (await this.weapons.existsBy({ slug: dto.slug }))
    ) {
      throw new ConflictException(`Weapon ${dto.slug} already exists`);
    }
    return this.weapons.save(this.weapons.merge(weapon, dto));
  }
}
