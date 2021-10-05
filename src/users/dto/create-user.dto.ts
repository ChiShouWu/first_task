import { IsString, IsBoolean } from 'class-validator';
export class CreateUserDto {
  @IsString()
  account: string;
  @IsString()
  password: string;
  @IsBoolean()
  username: string;
}
