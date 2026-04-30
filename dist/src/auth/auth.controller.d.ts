import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        sessionToken: string;
        user: {
            id: string;
            username: string;
            createdAt: Date;
        };
    }>;
}
