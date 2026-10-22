import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  RequestTimeoutException,
} from '@nestjs/common';
import { CoffeesService } from './coffees.service.js';
import { CreateCoffeeDto } from './dto/create-coffee.dto.js';
import { UpdateCoffeeDto } from './dto/update-coffee.dto.js';
import { CircuitBreakerInterceptor } from '../common/interceptors/circuit-breaker/circuit-breaker.interceptor.js';
import { EntityExistsPipe } from '../common/pipes/entity-exists/entity-exists.pipe.js';
import { Coffee } from './entities/coffee.entity.js';

@Controller('coffees')
export class CoffeesController {
  constructor(private readonly coffeesService: CoffeesService) {}

  @Post()
  create(@Body() createCoffeeDto: CreateCoffeeDto) {
    return this.coffeesService.create(createCoffeeDto);
  }

  @Get()
  findAll() {
    console.log('🦊 "findAll" executed');
    throw new RequestTimeoutException('💥 Error!'); // 👈
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coffeesService.findOne(+id);
  }

  @Patch(':id')
  update(
    // @Param('id') id: string,
    @Param('id', EntityExistsPipe(Coffee)) id: string, // 👈 example of using the new Pipe (comment out next line)
    @Body() updateCoffeeDto: UpdateCoffeeDto,
  ) {
    return this.coffeesService.update(+id, updateCoffeeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coffeesService.remove(+id);
  }
}
