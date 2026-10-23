import { Controller, Get, Req } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentFailedEvent } from './events/payment-failed.event.js';
import { ContextId, ContextIdFactory, ModuleRef } from '@nestjs/core';
import { type Request } from 'express';

@Controller('payments-webhook')
export class PaymentsWebhookController {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly moduleRef: ModuleRef,
  ) {}

  @Get()
  webhook(@Req() request: Request) {
    const contextId = ContextIdFactory.create();
    const paymentId = Math.floor(Math.random() * 1000);

    this.moduleRef.registerRequestByContextId(request, contextId);

    this.eventEmitter.emit(
      PaymentFailedEvent.key,
      new PaymentFailedEvent(paymentId, { contextId }),
    );
  }

  // 💡 Real-world production webhook pattern:
  // @Post()
  // @HttpCode(HttpStatus.OK)
  // async handleWebhook(@Req() request: Request, @Body() body: any) {
  //   const contextId = ContextIdFactory.create();
  //   this.moduleRef.registerRequestByContextId(request, contextId);
  //   this.eventEmitter.emit(PaymentFailedEvent.key, new PaymentFailedEvent(body.paymentId, { contextId }));
  //   return { received: true }; // Fast acknowledge for Stripe/PayPal
  // }
}
