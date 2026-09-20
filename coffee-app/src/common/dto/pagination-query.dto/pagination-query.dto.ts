import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsPositive } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsPositive()
  limit: number;

  @IsOptional()
  @IsPositive()
  offset?: number;
}
