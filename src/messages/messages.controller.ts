import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';

@Controller('rooms/:id/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  getMessages(@Param('id') id: string, @Query() dto: GetMessagesDto) {
    return this.messagesService.getMessages(id, dto.limit, dto.before);
  }

  @Post()
  @HttpCode(201)
  sendMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: { userId: string; username: string },
  ) {
    return this.messagesService.sendMessage(id, user.username, dto.content);
  }
}
