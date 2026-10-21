import { Controller, Get, Query } from '@nestjs/common';
import { resolve } from 'path';
import { Piscina } from 'piscina';

@Controller('fibonacci')
export class FibonacciController {
  // constructor(private readonly workerHost: FibonacciWorkerHost) {}

  fibonacciWorker = new Piscina({
    filename: resolve(import.meta.dirname, 'fibonacci.worker.js'),
  });

  @Get()
  fibonacci(@Query('n') n = 10) {
    return this.fibonacciWorker.run(+n);
  }
}
