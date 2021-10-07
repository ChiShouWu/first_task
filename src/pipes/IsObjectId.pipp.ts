import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { Mongoose } from 'mongoose';

@Injectable()
export class IsObjectIdPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if(!new Mongoose().isValidObjectId(value)) throw new BadRequestException();
    return value;
  }
}