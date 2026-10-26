import {
  Logger,
  OnModuleDestroy,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Subscription } from 'rxjs';
import type { Namespace, Socket } from 'socket.io';
import { type AuthUser, toAuthUser } from '../common/auth.js';
import type { QuestUpdate } from './dto/quest.dto.js';
import { QuestEventDto } from './dto/quest.dto.js';
import { QuestsService } from './quests.service.js';

const playerRoom = (playerId: string) => `player:${playerId}`;

/**
 * Real-time quest channel.
 * - Players connect with their JWT and receive `quest:progress` / `quest:completed` pushes.
 * - Only an authoritative game server (role `server`) may emit `quest:event`, so clients
 *   can't grant themselves progress.
 */
@WebSocketGateway({ namespace: '/quests', cors: { origin: '*' } })
export class QuestsGateway
  implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy
{
  @WebSocketServer() private readonly server: Namespace;
  private readonly logger = new Logger(QuestsGateway.name);
  private subscription?: Subscription;

  constructor(
    private readonly quests: QuestsService,
    private readonly jwt: JwtService,
  ) {}

  afterInit(): void {
    this.subscription = this.quests.updates$.subscribe(
      ({ playerId, updates }) => this.push(playerId, updates),
    );
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  async handleConnection(client: Socket): Promise<void> {
    const auth = client.handshake.auth as { token?: string } | undefined;
    const token =
      auth?.token ??
      client.handshake.headers.authorization?.replace(/^Bearer /, '');
    try {
      const user = toAuthUser(await this.jwt.verifyAsync(token ?? ''));
      client.data.user = user;
      await client.join(playerRoom(user.id));
    } catch {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('quest:event')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      exceptionFactory: (e) => new WsException(e),
    }),
  )
  async onQuestEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() event: QuestEventDto,
  ): Promise<{ updates: QuestUpdate[] }> {
    const user = client.data.user as AuthUser | undefined;
    if (user?.role !== 'server')
      throw new WsException('Only game servers can report quest events');
    const updates = await this.quests.applyEvent(
      event.playerId,
      event.type,
      event.amount,
    );
    return { updates };
  }

  private push(playerId: string, updates: QuestUpdate[]): void {
    const room = this.server.to(playerRoom(playerId));
    for (const update of updates) {
      room.emit('quest:progress', update);
      if (update.justCompleted) {
        room.emit('quest:completed', update);
        this.logger.log(`Player ${playerId} completed ${update.code}`);
      }
    }
  }
}
