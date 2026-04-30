import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../common/guards/session.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Controller('rooms')
@UseGuards(SessionGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  findAll() {
    return this.roomsService.findAll();
  }

  @Post()
  @HttpCode(201)
  create(
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: { userId: string; username: string },
  ) {
    return this.roomsService.create(dto.name, user.username);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.roomsService.findById(id);
  }

  @Delete(':id')
  @HttpCode(200)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; username: string },
  ) {
    await this.roomsService.delete(id, user.username);
    return { deleted: true };
  }
}
