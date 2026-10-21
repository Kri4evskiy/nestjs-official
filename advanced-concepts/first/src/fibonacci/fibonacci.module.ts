import { Module } from '@nestjs/common';
import { FibonacciController } from './fibonacci.controller.js';
import { FibonacciWorkerHost } from './fibonacci-worker.host.js';

@Module({
  controllers: [FibonacciController],
  providers: [FibonacciWorkerHost],
})
export class FibonacciModule {}
