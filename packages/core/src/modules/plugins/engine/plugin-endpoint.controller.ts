import {
  Controller,
  All,
  Req,
  Res,
  Param,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Request, Response } from "express";
import { PluginEndpointRegistry } from "./plugin-endpoint.registry";

/**
 * Dynamic router for plugin-registered custom API endpoints.
 * Routes: /api/plugins/:pluginId/endpoints/*
 */
@ApiTags("plugin-endpoints")
@Controller("plugins/:pluginId/endpoints")
export class PluginEndpointController {
  private readonly logger = new Logger(PluginEndpointController.name);

  constructor(private readonly registry: PluginEndpointRegistry) {}

  @All("*")
  @ApiOperation({ summary: "Plugin custom endpoint (dynamic)" })
  async handlePluginEndpoint(
    @Param("pluginId") pluginId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const basePath = `/api/plugins/${pluginId}/endpoints`;
    const subPath = req.path.replace(basePath, "") || "/";
    const method = req.method.toUpperCase();

    const handler = this.registry.findHandler(pluginId, method, subPath);
    if (!handler) {
      throw new NotFoundException(
        `No endpoint registered for ${method} ${subPath} in plugin ${pluginId}`,
      );
    }

    const endpointReq = {
      method: method as any,
      path: subPath,
      params: req.params,
      query: req.query as Record<string, string>,
      body: req.body,
      headers: req.headers as Record<string, string>,
      user: (req as any).user,
    };

    let statusCode = 200;
    const endpointRes = {
      status(code: number) {
        statusCode = code;
        return endpointRes;
      },
      json(data: any) {
        res.status(statusCode).json(data);
      },
      send(data: string) {
        res.status(statusCode).send(data);
      },
    };

    try {
      await handler(endpointReq, endpointRes);
    } catch (error) {
      this.logger.error(
        `Plugin endpoint error (${pluginId} ${method} ${subPath}): ${error}`,
      );
      if (!res.headersSent) {
        res.status(500).json({ error: "Plugin endpoint error" });
      }
    }
  }
}
