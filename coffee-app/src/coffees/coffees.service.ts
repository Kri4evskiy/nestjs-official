import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCoffeeDto } from './dto/create-coffee.dto/create-coffee.dto';
import { Coffee } from './entities/coffee.entity';
import { UpdateCoffeeDto } from './dto/update-coffee.dto/update-coffee.dto';

@Injectable()
export class CoffeesService {
  private coffees: Coffee[] = [
    {
      id: 1,
      name: 'Latte',
      brand: 'Starbucks',
      flavors: ['chocolate', 'vanilla'],
    },
  ];

  findAll() {
    return this.coffees;
  }

  findOne(id: number) {
    const coffee = this.coffees.find((item) => item.id === id);
    if (!coffee) {
      throw new NotFoundException('Coffee not found');
    }

    return coffee;
  }

  create(createCoffeeDto: CreateCoffeeDto) {
    const biggestId = Math.max(...this.coffees.map((item) => item.id));
    const data = {
      id: biggestId + 1,
      ...createCoffeeDto,
    };
    this.coffees.push(data);

    return data;
  }

  update(id: number, updateCoffeeDto: UpdateCoffeeDto) {
    const existingCoffee = this.findOne(id);
    if (existingCoffee) {
      const index = this.coffees.findIndex((item) => item.id === id);

      this.coffees[index] = {
        ...existingCoffee,
        ...updateCoffeeDto,
      };

      return this.coffees[index];
    }
  }

  remove(id: number) {
    const coffeeIndex = this.coffees.findIndex((item) => item.id === id);
    if (coffeeIndex >= 0) {
      this.coffees.splice(coffeeIndex, 1);
    }
  }
}
