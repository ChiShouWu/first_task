import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

export type UserDocument = User & Document;
@Schema()
export class User {
  @ApiProperty()
  @Prop({ requried: true })
  username: string;

  @ApiProperty()
  @Prop({ requried: true })
  account: string;

  @ApiProperty()
  @Prop()
  password: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
