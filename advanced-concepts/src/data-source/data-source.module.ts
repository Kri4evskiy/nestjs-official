import { Module } from '@nestjs/common';
import { DataSourceService } from './data-source.service.js';

@Module({
  providers: [
    DataSourceService,
    // {
    //   provide: 'DATA_SOURCE',
    //   useFactory: (payload) => new DataSource(...),
    //   scope: Scope.REQUEST,
    //   durable: true,
    // },
  ],
  exports: [DataSourceService],
})
export class DataSourceModule {}
