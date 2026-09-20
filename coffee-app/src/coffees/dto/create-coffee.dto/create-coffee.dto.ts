import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCoffeeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Name of the coffee',
    minLength: 2,
    default: 'Coffee',
  })
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiProperty({
    nullable: false,
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  readonly brand: string;

  @ApiProperty({
    description: 'Flavors of the coffee',
    type: [String],
    example: ['Chocolate', 'Vanilla', 'Caramel'],
  })
  @IsString({ each: true })
  readonly flavors: string[];
}
