import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        JwtModule.register({
            global: true,
            secret: 'SuperPrivateSecretToBuildJWTs',
            signOptions: { expiresIn: '300s' },
        }),
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
