import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AuthService } from '../src/auth/auth.service.js';
import { QuestsService } from '../src/quests/quests.service.js';
import { configureApp } from '../src/setup.js';

describe('Game backend (e2e)', () => {
  let app: INestApplication<App>;
  let baseUrl: string;
  let adminToken: string;
  let serverToken: string;
  let alice: { token: string; id: string };
  let bob: { token: string; id: string };
  const sockets: Socket[] = [];

  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  const connect = (token: string) =>
    new Promise<Socket>((resolve, reject) => {
      const socket = io(`${baseUrl}/quests`, {
        auth: { token },
        transports: ['websocket'],
      });
      sockets.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);
    baseUrl = await app.getUrl();

    const auth = app.get(AuthService);
    adminToken = (
      await auth.register(
        { username: 'admin', password: 'admin-password' },
        'admin',
      )
    ).accessToken;
    serverToken = (
      await auth.register(
        { username: 'server', password: 'server-password' },
        'server',
      )
    ).accessToken;

    const quests = app.get(QuestsService);
    await quests.create({
      code: 'first-match',
      title: 'Play a match',
      eventType: 'match_played',
      target: 1,
      rewardXp: 50,
    });
    await quests.create({
      code: 'kills-10',
      title: '10 kills',
      eventType: 'kill',
      target: 10,
      rewardXp: 150,
    });
  });

  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await app.close();
  });

  describe('auth', () => {
    it('registers players and returns a usable token', async () => {
      const a = await http()
        .post('/auth/register')
        .send({ username: 'alice', password: 'password-a' })
        .expect(201);
      const b = await http()
        .post('/auth/register')
        .send({ username: 'bob', password: 'password-b' })
        .expect(201);
      alice = { token: a.body.accessToken, id: a.body.player.id };
      bob = { token: b.body.accessToken, id: b.body.player.id };

      expect(a.body.player).toEqual({
        id: expect.any(String),
        username: 'alice',
        role: 'player',
      });
      await http().get('/players/me').set(bearer(alice.token)).expect(200);
    });

    it('never returns the password hash', async () => {
      const me = await http()
        .get('/players/me')
        .set(bearer(alice.token))
        .expect(200);
      expect(me.body).not.toHaveProperty('passwordHash');
    });

    it('rejects duplicates, bad passwords and malformed input', async () => {
      await http()
        .post('/auth/register')
        .send({ username: 'alice', password: 'password-x' })
        .expect(409);
      await http()
        .post('/auth/login')
        .send({ username: 'alice', password: 'wrong-pass' })
        .expect(401);
      await http()
        .post('/auth/register')
        .send({ username: 'a', password: 'short' })
        .expect(400);
      await http().get('/players/me').expect(401);
    });
  });

  describe('weapons (live-ops)', () => {
    it('lets admins create and rebalance weapons; clients read the live catalog', async () => {
      const weapon = {
        slug: 'smg-viper',
        name: 'Viper SMG',
        damage: 18,
        fireRate: 12.5,
        magazineSize: 30,
        reloadTime: 1.8,
      };
      await http()
        .post('/weapons')
        .set(bearer(alice.token))
        .send(weapon)
        .expect(403);
      await http()
        .post('/weapons')
        .set(bearer(adminToken))
        .send(weapon)
        .expect(201);

      await http()
        .patch('/weapons/smg-viper')
        .set(bearer(adminToken))
        .send({ damage: 16 })
        .expect(200);
      const catalog = await http().get('/weapons').expect(200);
      expect(catalog.body).toEqual([
        expect.objectContaining({ slug: 'smg-viper', damage: 16 }),
      ]);
    });

    it('hides disabled weapons from clients but not from admins', async () => {
      await http()
        .patch('/weapons/smg-viper')
        .set(bearer(adminToken))
        .send({ enabled: false })
        .expect(200);
      expect((await http().get('/weapons').expect(200)).body).toEqual([]);
      expect(
        (await http().get('/weapons/all').set(bearer(adminToken)).expect(200))
          .body,
      ).toHaveLength(1);
    });
  });

  describe('matches, stats and quests', () => {
    it('only game servers can report results', async () => {
      await http()
        .post('/matches')
        .set(bearer(alice.token))
        .send({})
        .expect(403);
    });

    it('records a match, feeds quests and pushes progress to the player socket', async () => {
      const aliceSocket = await connect(alice.token);
      const completed = new Promise((resolve) =>
        aliceSocket.once('quest:completed', resolve),
      );

      await http()
        .post('/matches')
        .set(bearer(serverToken))
        .send({
          mode: 'ranked',
          map: 'harbor',
          durationSeconds: 600,
          winnerTeam: 'guards',
          participants: [
            {
              playerId: alice.id,
              team: 'guards',
              kills: 7,
              deaths: 2,
              score: 1400,
            },
            {
              playerId: bob.id,
              team: 'infiltrators',
              kills: 2,
              deaths: 7,
              score: 600,
            },
          ],
        })
        .expect(201);

      await expect(completed).resolves.toMatchObject({
        code: 'first-match',
        justCompleted: true,
      });

      const history = await http()
        .get(`/players/${alice.id}/matches`)
        .set(bearer(alice.token))
        .expect(200);
      expect(history.body).toEqual([
        expect.objectContaining({ map: 'harbor', won: true, kills: 7 }),
      ]);

      const stats = await http()
        .get(`/players/${alice.id}/stats`)
        .set(bearer(bob.token))
        .expect(200);
      expect(stats.body).toEqual({
        matches: 1,
        wins: 1,
        kills: 7,
        deaths: 2,
        killDeathRatio: 3.5,
      });

      const quests = await http()
        .get('/quests/me')
        .set(bearer(alice.token))
        .expect(200);
      expect(quests.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'first-match', completed: true }),
          expect.objectContaining({
            code: 'kills-10',
            progress: 7,
            completed: false,
          }),
        ]),
      );
      expect(
        (await http().get('/players/me').set(bearer(alice.token))).body.xp,
      ).toBe(50);
    });

    it('rejects results with unknown or duplicated players', async () => {
      const base = { mode: 'ranked', map: 'harbor', durationSeconds: 60 };
      const row = { team: 'guards', kills: 0, deaths: 0, score: 0 };
      await http()
        .post('/matches')
        .set(bearer(serverToken))
        .send({
          ...base,
          participants: [
            { ...row, playerId: '00000000-0000-4000-8000-000000000000' },
          ],
        })
        .expect(400);
      await http()
        .post('/matches')
        .set(bearer(serverToken))
        .send({
          ...base,
          participants: [
            { ...row, playerId: bob.id },
            { ...row, playerId: bob.id },
          ],
        })
        .expect(400);
    });
  });

  describe('quest socket', () => {
    it('accepts live events from the game server and acknowledges the new progress', async () => {
      const server = await connect(serverToken);
      const ack = await server.emitWithAck('quest:event', {
        playerId: alice.id,
        type: 'kill',
        amount: 3,
      });

      expect(ack.updates).toEqual([
        expect.objectContaining({
          code: 'kills-10',
          progress: 10,
          justCompleted: true,
        }),
      ]);
    });

    it('refuses quest events from player clients', async () => {
      const client = await connect(bob.token);
      const error = new Promise((resolve) => client.once('exception', resolve));
      client.emit('quest:event', {
        playerId: bob.id,
        type: 'kill',
        amount: 100,
      });

      await expect(error).resolves.toMatchObject({
        message: 'Only game servers can report quest events',
      });
    });

    it('disconnects sockets without a valid token', async () => {
      const socket = io(`${baseUrl}/quests`, {
        auth: { token: 'nope' },
        transports: ['websocket'],
      });
      sockets.push(socket);
      await new Promise<void>((resolve) =>
        socket.once('disconnect', () => resolve()),
      );
      expect(socket.connected).toBe(false);
    });
  });
});
