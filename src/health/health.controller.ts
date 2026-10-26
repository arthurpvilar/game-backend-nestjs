import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<{ status: 'ok'; database: 'up' | 'down' }> {
    const database = await this.dataSource.query('SELECT 1').then(
      () => 'up' as const,
      () => 'down' as const,
    );
    return { status: 'ok', database };
  }
}
