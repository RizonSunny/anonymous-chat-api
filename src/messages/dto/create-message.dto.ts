import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MinLength(1, { message: 'content must not be empty' })
  @MaxLength(1000, { message: 'Message content must not exceed 1000 characters' })
  content: string;
}
