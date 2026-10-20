import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { INTERVAL_HOST_KEY } from '../decorators/interval-host.decorator.js';
import { INTERVAL_KEY } from '../decorators/interval.decorator.js';

@Injectable()
export class IntervalScheduler implements OnApplicationBootstrap {
  private readonly intervals: NodeJS.Timeout[] = [];

  constructor(
    private readonly discoverService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  onApplicationBootstrap() {
    const providers = this.discoverService.getProviders();
    providers.forEach((provider) => {
      const { instance } = provider;
      const prototype = instance && Object.getPrototypeOf(instance);

      if (!prototype || !instance) return;
      const isIntervalHost =
        this.reflector.get(INTERVAL_HOST_KEY, instance.constructor) ?? false;
      if (!isIntervalHost) {
        return;
      }

      console.log(provider.token);

      const methodKeys = this.metadataScanner.getAllMethodNames(prototype);
      methodKeys.forEach((methodKey) => {
        const interval = this.reflector.get(INTERVAL_KEY, instance[methodKey]);
        if (interval === undefined) {
          return;
        }
        const intervalRef = setInterval(() => instance[methodKey](), interval);
        this.intervals.push(intervalRef);
      });
    });
  }
  onApplicationShutdown(signal?: string) {
    this.intervals.forEach((intervalRef) => clearInterval(intervalRef));
  }
}
