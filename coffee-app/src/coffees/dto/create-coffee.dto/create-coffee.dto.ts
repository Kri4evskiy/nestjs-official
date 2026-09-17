import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCoffeeDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsString()
  @IsNotEmpty()
  readonly brand: string;

  @IsString({ each: true })
  readonly flavors: string[];
}
