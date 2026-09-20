import { Test, TestingModule } from '@nestjs/testing';
import { CoffeesService } from './coffees.service';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { Flavor } from './entities/flavor.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Coffee } from './entities/coffee.entity';
import coffeesConfig from './config/coffees.config';
import { NotFoundException } from '@nestjs/common';

type MockRepository<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;
const createMockRepository = <
  T extends ObjectLiteral = any,
>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  preload: jest.fn(),
  remove: jest.fn(),
});

describe('CoffeesService', () => {
  let service: CoffeesService;
  let coffeeRepository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoffeesService,
        { provide: DataSource, useValue: {} },
        {
          provide: getRepositoryToken(Coffee),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Flavor),
          useValue: createMockRepository(),
        },
        { provide: coffeesConfig.KEY, useValue: {} },
      ],
    }).compile();

    service = module.get<CoffeesService>(CoffeesService);
    // service = await module.resolve(CoffeesService);
    coffeeRepository = module.get<MockRepository>(getRepositoryToken(Coffee));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    describe('when the coffee id is existing', () => {
      it('should return a coffee object', async () => {
        const coffeeId = 1;
        const expectedCoffee = {};

        coffeeRepository.findOne?.mockReturnValue(expectedCoffee);

        const coffee = await service.findOne(coffeeId);
        expect(coffee).toEqual(expectedCoffee);
      });
    });
    describe('otherwise', () => {
      it('should throw an NotFounException', async () => {
        const coffeeId = 1;
        coffeeRepository.findOne?.mockReturnValue(undefined);

        try {
          await service.findOne(coffeeId);
          expect(false).toBeTruthy(); // we should never hit this line
        } catch (err) {
          expect(err).toBeInstanceOf(NotFoundException);
          expect((err as Error).message).toEqual(`Coffee not found`);
        }
      });
    });
  });
});
