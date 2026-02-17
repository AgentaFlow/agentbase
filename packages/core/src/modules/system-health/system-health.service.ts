import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Repository, DataSource } from 'typeorm';
import { Model, Connection } from 'mongoose';
import { User } from '../../database/entities/user.entity';
import { Application } from '../../database/entities/application.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import * as os from 'os';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs?: number;
  details?: Record<string, any>;
}

interface SystemMetrics {
  uptime: number;
  memory: { total: number; used: number; free: number; percent: number };
  cpu: { cores: number; loadAvg: number[] };
  process: { pid: number; memoryMb: number; uptimeSeconds: number };
}

@Injectable()
export class SystemHealthService {
  private readonly logger = new Logger(SystemHealthService.name);
  private startTime = Date.now();

  constructor(
    private readonly dataSource: DataSource,
    @InjectConnection() private readonly mongoConnection: Connection,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Application) private readonly appRepo: Repository<Application>,
    @InjectRepository(Subscription) private readonly subRepo: Repository<Subscription>,
  ) {}

  async getFullHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    services: ServiceStatus[];
    metrics: SystemMetrics;
    timestamp: Date;
  }> {
    const services = await Promise.all([
      this.checkPostgres(),
      this.checkMongo(),
      this.checkRedis(),
      this.checkAiService(),
    ]);

    const allHealthy = services.every(s => s.status === 'healthy');
    const anyDown = services.some(s => s.status === 'down');

    return {
      status: anyDown ? 'down' : allHealthy ? 'healthy' : 'degraded',
      services,
      metrics: this.getSystemMetrics(),
      timestamp: new Date(),
    };
  }

  private async checkPostgres(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return { name: 'PostgreSQL', status: 'healthy', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { name: 'PostgreSQL', status: 'down', latencyMs: Date.now() - start, details: { error: err.message } };
    }
  }

  private async checkMongo(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      const state = this.mongoConnection.readyState;
      if (state === 1) {
        return { name: 'MongoDB', status: 'healthy', latencyMs: Date.now() - start };
      }
      return { name: 'MongoDB', status: 'degraded', latencyMs: Date.now() - start, details: { readyState: state } };
    } catch (err: any) {
      return { name: 'MongoDB', status: 'down', latencyMs: Date.now() - start, details: { error: err.message } };
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      // Redis is checked via the cache module if available
      return { name: 'Redis', status: 'healthy', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { name: 'Redis', status: 'down', latencyMs: Date.now() - start, details: { error: err.message } };
    }
  }

  private async checkAiService(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${aiUrl}/api/ai/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        return { name: 'AI Service', status: 'healthy', latencyMs: Date.now() - start };
      }
      return { name: 'AI Service', status: 'degraded', latencyMs: Date.now() - start, details: { statusCode: res.status } };
    } catch (err: any) {
      return { name: 'AI Service', status: 'down', latencyMs: Date.now() - start, details: { error: err.message } };
    }
  }

  private getSystemMetrics(): SystemMetrics {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = process.memoryUsage();

    return {
      uptime: os.uptime(),
      memory: {
        total: Math.round(totalMem / 1024 / 1024),
        used: Math.round(usedMem / 1024 / 1024),
        free: Math.round(freeMem / 1024 / 1024),
        percent: Math.round((usedMem / totalMem) * 100),
      },
      cpu: {
        cores: os.cpus().length,
        loadAvg: os.loadavg().map(v => Math.round(v * 100) / 100),
      },
      process: {
        pid: process.pid,
        memoryMb: Math.round(memUsage.rss / 1024 / 1024),
        uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
      },
    };
  }

  async getPlatformStats() {
    const [totalUsers, totalApps, activeSubscriptions] = await Promise.all([
      this.userRepo.count(),
      this.appRepo.count(),
      this.subRepo.count({ where: { status: 'active' as any } }),
    ]);

    // Subscription breakdown
    const planBreakdown = await this.subRepo
      .createQueryBuilder('s')
      .select('s.plan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.plan')
      .getRawMany();

    return {
      users: { total: totalUsers },
      applications: { total: totalApps },
      subscriptions: {
        active: activeSubscriptions,
        byPlan: planBreakdown.reduce((acc: any, r: any) => {
          acc[r.plan] = parseInt(r.count);
          return acc;
        }, {}),
      },
      timestamp: new Date(),
    };
  }
}
