import { PartialType } from '@nestjs/mapped-types';
import { CreateCoffeeDto } from './create-coffee.dto.js';

export class UpdateCoffeeDto extends PartialType(CreateCoffeeDto) {}
