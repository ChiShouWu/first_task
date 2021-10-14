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
  UsePipes,
  ValidationPipe,
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
import { extname, join } from 'path';
import {
  GrpcMethod,
  GrpcStreamMethod,
  RpcException,
} from '@nestjs/microservices';
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
  updateMicro(updateUserDto: UpdateUserDto) {
    const { id } = updateUserDto;
    return this.usersService.update(id, updateUserDto);
  }

  @GrpcMethod('UserService', 'findAll')
  async findAllMicro() {
    return { Users: await this.usersService.findAll() };
  }

  @GrpcMethod('UserService', 'findById')
  async findByIdMicro(updateUserDto: UpdateUserDto) {
    const { id } = updateUserDto;
    if (id) return await this.usersService.findOne(updateUserDto.id);
    throw new RpcException({
      code: 3,
      message: 'Bad request, no user id receieved',
    });
  }

  @GrpcMethod('UserService', 'delete')
  @UsePipes(new ValidationPipe())
  async removeMicro(updateUserDto: UpdateUserDto) {
    const removedUser = await this.usersService.remove(updateUserDto.id);
    if (removedUser !== null) return { success: true };
    return;
  }

  @GrpcStreamMethod('UserService', 'uploadFile')
  uploadFileMicro(messages: Observable<UploadFileDto>): Observable<any> {
    const subject = new Subject();
    let writeStream: fs.WriteStream;
    let newFilename = '';

    const onNext = (uploadFile: UploadFileDto) => {
      if (!writeStream) {
        newFilename = this.usersService.createFileName(uploadFile.filename);
        writeStream = fs.createWriteStream(`./uploads/${newFilename}`);
      }

      // writeStream = writeStream ?? writeStream.write(uploadFile.chunk);

      subject.next({
        reply: {
          stage: UploadStage.uploading,
          filename: newFilename,
        },
      });
    };

    const onComplete = () => {
      writeStream?.close();

      subject.next({
        reply: {
          stage: UploadStage.complete,
          filename: newFilename,
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
