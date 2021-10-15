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
import { extname } from 'path';
import {
  GrpcMethod,
  GrpcStreamMethod,
  RpcException,
} from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { status } from '@grpc/grpc-js';
import * as fs from 'fs';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IsObjectIdPipe } from 'src/pipes/IsObjectId.pipp';
import { User } from './user.schema';
import { ApiFile } from 'src/decorators/api.decorator';
import { NotFoundInterceptor } from 'src/interceptors/notfound.interceptor';
import {
  UploadFileDto,
  UploadStage,
  UploadStatus,
} from './dto/upload-file.dto';

@ApiTags('users')
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
  @UseInterceptors(NotFoundInterceptor)
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
  @UseInterceptors(NotFoundInterceptor)
  async findOne(@Param('id', IsObjectIdPipe) id: string) {
    return await this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'User found and updated success',
    type: User,
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @UseInterceptors(NotFoundInterceptor)
  async update(
    @Param('id', IsObjectIdPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOkResponse({
    description: 'User remove success',
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @UseInterceptors(NotFoundInterceptor)
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
  @UseInterceptors(NotFoundInterceptor)
  async updateMicro(updateUserDto: UpdateUserDto) {
    const { id } = updateUserDto;
    return await this.usersService.update(id, updateUserDto);
  }

  @GrpcMethod('UserService', 'findAll')
  @UseInterceptors(NotFoundInterceptor)
  async findAllMicro() {
    return { Users: await this.usersService.findAll() };
  }

  @GrpcMethod('UserService', 'findById')
  @UseInterceptors(NotFoundInterceptor)
  async findByIdMicro(updateUserDto: UpdateUserDto) {
    const { id } = updateUserDto;
    if (id) return await this.usersService.findOne(updateUserDto.id);
    throw new RpcException({
      code: status.INVALID_ARGUMENT,
      message: 'Bad request, no user id receieved',
    });
  }

  @GrpcMethod('UserService', 'delete')
  @UsePipes(new ValidationPipe())
  @UseInterceptors(NotFoundInterceptor)
  async removeMicro(updateUserDto: UpdateUserDto) {
    const removedUser = await this.usersService.remove(updateUserDto.id);
    if (removedUser !== null) return { success: true };
    return;
  }

  @GrpcStreamMethod('UserService', 'uploadFile')
  uploadFileMicro(
    messages: Observable<UploadFileDto>,
  ): Observable<UploadStatus> {
    return this.usersService.uploadFile(messages);
  }
}
