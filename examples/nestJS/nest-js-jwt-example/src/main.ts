import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { buildAuthTokensSwagger, JWTListingPlugin } from './swagger-jwt-plugin';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const swaggerOptions = {
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        persistAuthorization: true,
        plugins: [JWTListingPlugin],
    };

    const swaggerDocBuilder = new DocumentBuilder().setTitle('JWTListingExample').addBearerAuth({
        name: 'Authorization',
        bearerFormat: 'Bearer',
        scheme: 'Bearer',
        type: 'http',
        in: 'Header',
    });
    // Add plugin
    const userInfo = [
        { name: 'Admin', role: 'admin' },
        { name: 'User', role: 'user' },
    ];
    const customTokens = buildAuthTokensSwagger(app.get(JwtService), 'SuperPrivateSecretToBuildJWTs', userInfo); // Autorizaciones para debug en swagger
    swaggerDocBuilder.addExtension('x-custom-tokens', customTokens);
    const swaggerDocConfig = swaggerDocBuilder.build();

    // Create swagger and add it
    const swaggerDoc = () => SwaggerModule.createDocument(app, swaggerDocConfig);
    SwaggerModule.setup('/docs', app, swaggerDoc, { swaggerOptions: swaggerOptions });

    await app.listen(2000);
}
bootstrap();
