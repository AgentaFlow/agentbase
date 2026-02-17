import { Module, Global } from '@nestjs/common';
import { HookEngine } from './hook.engine';
import { HooksController } from './hooks.controller';

@Global()
@Module({
  controllers: [HooksController],
  providers: [HookEngine],
  exports: [HookEngine],
})
export class HooksModule {}
