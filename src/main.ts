import { NestApplication, NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // swagger config
  const config = new DocumentBuilder()
    .setTitle('User API')
    .setDescription('First task a user CRUD and file upload, with REST & gRPC')
    .setVersion('1.0')
    .addTag('Users')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      // url: 'localhost:5000',
      package: 'user',
      protoPath: join(__dirname, '/proto/user.proto'),
    },
  });

  app.startAllMicroservices();
  await app.listen(3000);
}

bootstrap();
