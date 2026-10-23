import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { TagsService } from './tags.service.js';
import { TagsController } from './tags.controller.js';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';

@Module({
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule implements OnApplicationBootstrap {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationBootstrap() {
    const contextId = ContextIdFactory.create();
    this.moduleRef.registerRequestByContextId({ hello: 'world' }, contextId);
    const tagsService = await this.moduleRef.resolve(TagsService, contextId);
    console.log(tagsService);
    // const contextId = ContextIdFactory.create();
    // const tagsServices = await Promise.all([
    //   this.moduleRef.resolve(TagsService, contextId),
    //   this.moduleRef.resolve(TagsService, contextId),
    // ]);
    // console.log(tagsServices[0] === tagsServices[1]);
  }
}
