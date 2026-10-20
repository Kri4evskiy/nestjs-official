import { Inject, Injectable } from '@nestjs/common';
import { CreateCoffeeDto } from './dto/create-coffee.dto.js';
import { UpdateCoffeeDto } from './dto/update-coffee.dto.js';
import { Coffee } from './entities/coffee.entity.js';
import { LazyModuleLoader } from '@nestjs/core';

export interface CoffeesDataSource {
  // OR alternatively "export type CoffeesDataSource = Coffee[]"
  [index: number]: Coffee;
}
export const COFFEES_DATA_SOURCE = Symbol('COFFEES_DATA_SOURCE');

@Injectable()
export class CoffeesService {
  constructor(
    @Inject(COFFEES_DATA_SOURCE) dataSource: CoffeesDataSource,
    private readonly lazyModuleLoader: LazyModuleLoader, // 👈 Injected from '@nestjs/core'
  ) {}

  async create(createCoffeeDto: CreateCoffeeDto) {
    // Lazy load RewardsModule
    // to check this method use command:
    // 1. curl -H 'content-type: application/json' localhost:3000/coffees -d "{}"
    // or
    // 2. Invoke-RestMethod -Uri http://localhost:3000/coffees -Method Post -ContentType "application/json" -Body "{}"

    console.time();
    // 1. Dynamically load RewardsModule on-demand
    const rewardsModuleRef = await this.lazyModuleLoader.load(() =>
      import('../rewards/rewards.module.js').then((m) => m.RewardsModule),
    );
    // 2. Dynamically import RewardsService and obtain instance from loaded moduleRef
    const { RewardsService } = await import('../rewards/rewards.service.js');
    const rewardsService = rewardsModuleRef.get(RewardsService);
    console.timeEnd();
    // 3. Execute method from lazy service
    rewardsService.grantTo();
    return 'This action adds a new coffee';
  }

  findAll() {
    return `This action returns all coffees`;
  }

  findOne(id: number) {
    return `This action returns a #${id} coffee`;
  }

  update(id: number, updateCoffeeDto: UpdateCoffeeDto) {
    return `This action updates a #${id} coffee`;
  }

  remove(id: number) {
    return `This action removes a #${id} coffee`;
  }
}
