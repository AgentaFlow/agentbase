import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ApplicationsService } from "./applications.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { UpdateApplicationDto } from "./dto/update-application.dto";
import { ApplicationConfigDto } from "./dto/application-config.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("applications")
@Controller("applications")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly appsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new AI application" })
  async create(@Request() req: any, @Body() dto: CreateApplicationDto) {
    return this.appsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: "List all applications for current user" })
  async findAll(@Request() req: any) {
    return this.appsService.findAllByOwner(req.user.sub);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get application by ID" })
  async findOne(@Request() req: any, @Param("id") id: string) {
    return this.appsService.findById(id, req.user.sub);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update application" })
  async update(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.appsService.update(id, req.user.sub, dto);
  }

  @Patch(":id/config")
  @ApiOperation({ summary: "Update application configuration" })
  async updateConfig(
    @Request() req: any,
    @Param("id") id: string,
    @Body() configDto: ApplicationConfigDto,
  ) {
    return this.appsService.updateConfig(id, req.user.sub, configDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete application" })
  async delete(@Request() req: any, @Param("id") id: string) {
    await this.appsService.delete(id, req.user.sub);
  }
}
