import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller()
@ApiBearerAuth()
export class AppController {
    constructor() {}

    @UseGuards(AuthGuard)
    @Get('Hello')
    getHello(): string {
        return 'Hello world';
    }
}
