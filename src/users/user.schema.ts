import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type UserDocument = User & Document;
@Schema()
export class User {
  @Prop({ requried: true })
  username: string;

  @Prop({ requried: true })
  account: string;

  @Prop()
  password: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
