import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class EventContext {
  constructor(@Inject(REQUEST) public readonly request: Request) {}

  // 💡 Real-world example: extracting provider-specific metadata via getters
  //
  // get provider(): 'stripe' | 'paypal' | 'unknown' {
  //   if (this.request.headers['stripe-signature']) return 'stripe';
  //   if (this.request.headers['paypal-transmission-sig']) return 'paypal';
  //   return 'unknown';
  // }
  //
  // get signature(): string | undefined {
  //   return (this.request.headers['stripe-signature'] ||
  //     this.request.headers['paypal-transmission-sig']) as string | undefined;
  // }
  //
  // get clientIp(): string {
  //   return (this.request.headers['x-forwarded-for'] as string) || this.request.ip || '';
  // }
}

