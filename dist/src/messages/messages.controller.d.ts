import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
export declare class MessagesController {
    private readonly messagesService;
    constructor(messagesService: MessagesService);
    getMessages(id: string, dto: GetMessagesDto): Promise<import("./messages.service").MessagesPage>;
    sendMessage(id: string, dto: CreateMessageDto, user: {
        userId: string;
        username: string;
    }): Promise<{
        content: string;
        id: string;
        roomId: string;
        username: string;
        createdAt: Date;
    }>;
}
