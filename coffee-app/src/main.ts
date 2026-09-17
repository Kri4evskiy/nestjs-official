import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 1. Очистка от лишнего: удаляет из входящего JSON поля, которых нет в DTO
      forbidNonWhitelisted: true, // 2. Строгий режим: если прислали лишнее поле, не просто удалять, а выбрасывать 400 ошибку
      transform: true, // 3. Авто-трансформация типов:
      // - Превращает '123' из URL (@Param('id')) в число 123, если в TS указано id: number
      // - Превращает plain JSON в настоящий инстанс класса DTO (new CreateCoffeeDto())
      transformOptions: {
        // 4. Опции трансформации (например, авто-приведение query/param типов к примитивам)
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
