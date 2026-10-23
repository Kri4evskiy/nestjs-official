import { Module } from '@nestjs/common';
import { PaymentsWebhookController } from './payments-webhook.controller.js';
import { NotificationsService } from './notifications.service.js';
import { SubscriptionsService } from './subscriptions.service.js';
import { EventContext } from './context/event-context.js';

@Module({
  controllers: [PaymentsWebhookController],
  providers: [NotificationsService, SubscriptionsService, EventContext],
})
export class PaymentsModule {}
