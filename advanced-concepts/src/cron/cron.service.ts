import { Injectable } from '@nestjs/common';
import { IntervalHost } from '../scheduler/decorators/interval-host.decorator.js';
import { Interval } from '../scheduler/decorators/interval.decorator.js';

@IntervalHost
@Injectable()
export class CronService {
  @Interval(2000)
  everyTwoSeconds() {
    console.log('This will be logged every 2 seconds 🐈 ');
  }
}
