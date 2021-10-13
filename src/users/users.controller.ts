import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiParam,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import * as fs from 'fs';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IsObjectIdPipe } from 'src/pipes/IsObjectId.pipp';
import { User } from './user.schema';
import { ApiFile } from 'src/decorators/api.decorator';
import { NotFoundInterceptor } from 'src/interceptors/notfound.interceptor';
import { UploadFileDto, UploadStage } from './dto/upload-file.dto';

@ApiTags('users')
@UseInterceptors(NotFoundInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @GrpcMethod('UserService', 'create')
  @ApiCreatedResponse({
    description: 'The record has been successfully created.',
    type: User,
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiForbiddenResponse({ description: 'Forbidden.' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return user;
  }

  @Get()
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiOkResponse({ description: 'Users found', type: [User] })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  async findAll() {
    const users = await this.usersService.findAll();
    return users;
  }

  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiOkResponse({
    description: 'Users found',
    type: User,
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  findOne(@Param('id', IsObjectIdPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'User found and updated success',
    type: User,
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  update(
    @Param('id', IsObjectIdPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOkResponse({
    description: 'User remove success',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  async remove(@Param('id', IsObjectIdPipe) id: string) {
    const result = await this.usersService.remove(id);
    if (result) return 'User remove success';
  }

  @Post('upload')
  @ApiFile()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const filename: string = uuidv4();
          const extension: string = extname(file.originalname);

          callback(null, `${filename}${extension}`);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return file.filename;
  }

  @Get('/file/:filename')
  @ApiParam({ name: 'filename', type: 'string' })
  @ApiOkResponse()
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiNotFoundResponse({ description: 'File not found' })
  getFile(@Param('filename') filename, @Res() res) {
    return res.sendFile(filename, { root: './uploads' });
  }

  // grpc part
  @GrpcMethod('UserService', 'update')
  updateMicro(@Body() updateUserDto: UpdateUserDto) {
    try {
      const { id } = updateUserDto;
      return this.usersService.update(id, updateUserDto);
    } catch (e) {
      return e.response;
    }
  }

  @GrpcMethod('UserService', 'findAll')
  async findAllMicro() {
    try {
      return { Users: await this.usersService.findAll() };
    } catch (e) {
      return e.response;
    }
  }

  @GrpcMethod('UserService', 'findById')
  async findByIdMicro(@Body() updateUserDto: UpdateUserDto) {
    try {
      return await this.usersService.findOne(updateUserDto.id);
    } catch (e) {
      return e.response;
    }
  }

  @GrpcMethod('UserService', 'delete')
  async removeMicro(@Body() updateUserDto: UpdateUserDto) {
    try {
      const removedUser = await this.usersService.remove(updateUserDto.id);
      if (removedUser !== null) return { success: true };
      return { success: false };
    } catch (e) {
      return e.response;
    }
  }

  @GrpcStreamMethod('UserService', 'uploadFile')
  uploadFileMicro(messages: Observable<UploadFileDto>): Observable<any> {
    // const filename: string = uuidv4();
    // const extension: string = extname(file.originalname);

    let writeStream: fs.WriteStream;

    const subject = new Subject();
    const onNext = (uploadFile: UploadFileDto) => {
      // TODO: change file name to dist
      writeStream =
        writeStream ??
        fs.createWriteStream(
          `uploads/${this.usersService.createFileName(uploadFile.filename)}`,
        );
      writeStream.write(uploadFile.chunk);
      subject.next({
        reply: {
          stage: UploadStage.uploading,
        },
      });
    };
    const onComplete = () => {
      writeStream.close();
      subject.next({
        reply: {
          stage: UploadStage.complete,
        },
      });
      subject.complete();
    };
    messages.subscribe({
      next: onNext,
      complete: onComplete,
    });
    return subject.asObservable();
  }
}
