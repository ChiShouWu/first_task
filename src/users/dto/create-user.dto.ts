import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'test' })
  @IsString()
  account: string;

  @ApiProperty({ example: 'test' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'alex' })
  @IsString()
  username: string;
}
