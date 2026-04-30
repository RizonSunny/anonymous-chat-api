import { IsString, Matches, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(2, 24)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username may only contain letters, numbers, and underscores' })
  username!: string;
}
