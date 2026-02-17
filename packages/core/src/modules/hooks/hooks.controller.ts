import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HookEngine } from './hook.engine';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('hooks')
@Controller('hooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HooksController {
  constructor(private readonly hookEngine: HookEngine) {}

  @Get()
  @ApiOperation({ summary: 'List all registered hooks (admin)' })
  getRegisteredHooks() {
    return this.hookEngine.getRegisteredHooks();
  }
}
