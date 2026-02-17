import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto, InviteMemberDto } from './dto/create-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamRole } from '../../database/entities';

@ApiTags('teams')
@Controller('teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team' })
  async create(@Request() req: any, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List teams for current user' })
  async findAll(@Request() req: any) {
    return this.teamsService.findByUser(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team details with members' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const team = await this.teamsService.findById(id);
    const role = await this.teamsService.getUserRole(id, req.user.sub);
    return { ...team, currentUserRole: role };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update team (admin/owner)' })
  async update(@Param('id') id: string, @Request() req: any, @Body() body: Partial<CreateTeamDto>) {
    return this.teamsService.update(id, req.user.sub, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team (owner only)' })
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.teamsService.delete(id, req.user.sub);
    return { deleted: true };
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List team members' })
  async getMembers(@Param('id') id: string) {
    const members = await this.teamsService.getMembers(id);
    return members.map(m => ({
      id: m.id,
      userId: m.userId,
      email: m.user?.email,
      displayName: m.user?.displayName,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Invite a member to the team' })
  async inviteMember(@Param('id') id: string, @Request() req: any, @Body() dto: InviteMemberDto) {
    return this.teamsService.inviteMember(id, req.user.sub, dto.email, (dto.role as TeamRole) || TeamRole.MEMBER);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from the team' })
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req: any) {
    await this.teamsService.removeMember(id, req.user.sub, memberId);
    return { removed: true };
  }

  @Put(':id/members/:memberId/role')
  @ApiOperation({ summary: 'Update member role (owner only)' })
  async updateRole(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req: any, @Body() body: { role: string }) {
    return this.teamsService.updateMemberRole(id, req.user.sub, memberId, body.role as TeamRole);
  }
}
