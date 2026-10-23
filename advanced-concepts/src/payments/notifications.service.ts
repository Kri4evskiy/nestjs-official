import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OnEvent } from '@nestjs/event-emitter';
import { EventContext } from './context/event-context.js';
import { PaymentFailedEvent } from './events/payment-failed.event.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly moduleRef: ModuleRef) {}

  @OnEvent(PaymentFailedEvent.key)
  async sendPaymentNotification(event: PaymentFailedEvent) {
    const eventContext = await this.moduleRef.resolve(
      EventContext,
      event.meta.contextId,
    );

    console.log('Sending a payment notification', eventContext.request.url);

    // 💡 Real-world usage: consuming getters from EventContext
    // console.log(`Payment failed via provider: ${eventContext.provider}`);
    // console.log(`Origin client IP: ${eventContext.clientIp}`);
    // if (eventContext.provider === 'stripe') {
    //   // e.g. send email with Stripe portal link
    // }
  }
}
