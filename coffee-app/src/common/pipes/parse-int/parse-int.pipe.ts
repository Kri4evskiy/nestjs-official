import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

// This is unnecessary pipe because we have ValidationPipe with transform option
//  but useful if we want to use it in multiple places without configuring ValidationPipe

@Injectable()
export class ParseIntPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    console.log('🚀 ~ ParseIntPipe ~ transform ~ metadata:', metadata);

    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException(
        `Validation failed. "${val}" is not an integer.`,
      );
    }
    return val;
  }
}
