import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '-';

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;

      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

      this.logger[level](
        `${method} ${originalUrl} ${statusCode} ${contentLength}B ${duration}ms — ${ip} "${userAgent.slice(0, 80)}"`,
      );
    });

    next();
  }
}
