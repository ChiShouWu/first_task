import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { extname } from 'path';
import { Observable, Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  UploadFileDto,
  UploadStage,
  UploadStatus,
} from './dto/upload-file.dto';
import { User, UserDocument } from './user.schema';
@Injectable()
export class UsersService {
  constructor(@InjectModel('User') private userModel: Model<UserDocument>) {}
  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return await createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return await this.userModel.find().exec();
  }

  async findOne(id: string): Promise<User> {
    return await this.userModel.findById(id).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
  }

  async remove(id: string) {
    return await this.userModel.findByIdAndRemove(id).exec();
  }

  createFileName(filename: string): string {
    const hashName: string = uuidv4();
    const extension: string = extname(filename);
    return `${hashName}${extension}`;
  }

  uploadFile(fileStream: Observable<UploadFileDto>): Observable<UploadStatus> {
    const subject = new Subject<UploadStatus>();

    let writeStream: fs.WriteStream;
    let newFilename = '';

    const onNext = (uploadFile: UploadFileDto) => {
      if (!writeStream) {
        newFilename = this.createFileName(uploadFile.filename);
        writeStream = fs.createWriteStream(`../uploads/${newFilename}`);
      }
      const uploadStatus: UploadStatus = {
        stage: UploadStage.uploading,
        filename: newFilename,
      };
      subject.next(uploadStatus);
    };

    const onComplete = () => {
      writeStream?.close();
      const uploadStatus: UploadStatus = {
        stage: UploadStage.complete,
        filename: newFilename,
      };
      subject.next(uploadStatus);

      subject.complete();
    };

    fileStream.subscribe({
      next: onNext,
      complete: onComplete,
    });
    return subject.asObservable();
  }
}
