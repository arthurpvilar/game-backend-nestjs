/**
 * Creates the admin and game-server accounts plus a starter catalog. Safe to run repeatedly.
 * Usage: npm run seed
 */
import { ConflictException, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AuthService } from './auth/auth.service.js';
import type { Role } from './common/auth.js';
import { QuestsService } from './quests/quests.service.js';
import { WeaponsService } from './weapons/weapons.service.js';

const logger = new Logger('Seed');

async function ignoreExisting(
  label: string,
  create: () => Promise<unknown>,
): Promise<void> {
  try {
    await create();
    logger.log(`created ${label}`);
  } catch (error) {
    if (!(error instanceof ConflictException)) throw error;
    logger.log(`skipped ${label} (already exists)`);
  }
}

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['log', 'error'],
});
const auth = app.get(AuthService);
const weapons = app.get(WeaponsService);
const quests = app.get(QuestsService);

const accounts: [string, string | undefined, Role][] = [
  ['admin', process.env.SEED_ADMIN_PASSWORD, 'admin'],
  ['game-server', process.env.SEED_SERVER_PASSWORD, 'server'],
];
for (const [username, password, role] of accounts) {
  if (!password) {
    logger.warn(
      `skipped ${username}: set SEED_${role === 'admin' ? 'ADMIN' : 'SERVER'}_PASSWORD`,
    );
    continue;
  }
  await ignoreExisting(`${role} account "${username}"`, () =>
    auth.register({ username, password }, role),
  );
}

for (const weapon of [
  {
    slug: 'pistol-m9',
    name: 'M9 Pistol',
    damage: 25,
    fireRate: 4,
    magazineSize: 15,
    reloadTime: 1.4,
  },
  {
    slug: 'smg-viper',
    name: 'Viper SMG',
    damage: 18,
    fireRate: 12.5,
    magazineSize: 30,
    reloadTime: 1.8,
  },
  {
    slug: 'rifle-ranger',
    name: 'Ranger Rifle',
    damage: 34,
    fireRate: 7,
    magazineSize: 25,
    reloadTime: 2.2,
  },
]) {
  await ignoreExisting(`weapon ${weapon.slug}`, () => weapons.create(weapon));
}

for (const quest of [
  {
    code: 'first-match',
    title: 'Play your first match',
    eventType: 'match_played' as const,
    target: 1,
    rewardXp: 50,
  },
  {
    code: 'daily-10-kills',
    title: 'Get 10 eliminations',
    eventType: 'kill' as const,
    target: 10,
    rewardXp: 150,
  },
  {
    code: 'win-3-matches',
    title: 'Win 3 matches',
    eventType: 'match_won' as const,
    target: 3,
    rewardXp: 300,
  },
]) {
  await ignoreExisting(`quest ${quest.code}`, () => quests.create(quest));
}

await app.close();
