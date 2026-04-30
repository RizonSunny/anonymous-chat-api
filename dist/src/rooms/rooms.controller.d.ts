import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
export declare class RoomsController {
    private readonly roomsService;
    constructor(roomsService: RoomsService);
    findAll(): Promise<import("./rooms.service").RoomWithActiveUsers[]>;
    create(dto: CreateRoomDto, user: {
        userId: string;
        username: string;
    }): Promise<{
        name: string;
        id: string;
        createdBy: string;
        createdAt: Date;
    }>;
    findById(id: string): Promise<import("./rooms.service").RoomWithActiveUsers>;
    delete(id: string, user: {
        userId: string;
        username: string;
    }): Promise<{
        deleted: boolean;
    }>;
}
