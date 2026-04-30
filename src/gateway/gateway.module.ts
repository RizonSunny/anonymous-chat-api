import { Module } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [RoomsModule],
  providers: [ChatGateway],
})
export class GatewayModule {}
