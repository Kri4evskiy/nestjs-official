import { SetMetadata } from '@nestjs/common';
import { INTERVAL_KEY } from './interval.decorator.js';

export const INTERVAL_HOST_KEY = 'INTERVAL_HOST_KEY';

export const IntervalHost: ClassDecorator = SetMetadata(
  INTERVAL_HOST_KEY,
  true,
);
