import { IsString} from 'class-validator';
export class CreateUserDto {
  @IsString()
  account: string;
  @IsString()
  password: string;
  @IsString()
  username: string;
}
