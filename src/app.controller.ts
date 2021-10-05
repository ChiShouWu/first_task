import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Post('world')
  getWorld(@Req() request): { name: string; val: number } {
    console.log(request);
    return { name: 'world', val: 123 };
  }
}
