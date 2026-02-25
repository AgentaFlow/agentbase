import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  BadRequestException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TeamsService } from "../../modules/teams/teams.service";
import { TeamRole } from "../../database/entities";

export const TEAM_ROLES_KEY = "teamRoles";

/**
 * Decorator to specify required team roles for a route.
 * If no roles are specified, any team member can access it.
 *
 * @example
 * @TeamRoles(TeamRole.OWNER, TeamRole.ADMIN)
 * @UseGuards(JwtAuthGuard, TeamGuard)
 * myEndpoint() { ... }
 */
export const TeamRoles = (...roles: TeamRole[]) =>
  SetMetadata(TEAM_ROLES_KEY, roles);

/**
 * Guard that extracts X-Team-Id from request headers, verifies
 * the authenticated user is a member of that team, and optionally
 * checks for specific team roles.
 *
 * Attaches `req.team` (Team) and `req.teamMember` (TeamMember) to the request.
 *
 * If no X-Team-Id header is present, the guard falls back to the
 * user's personal team.
 */
@Injectable()
export class TeamGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly teamsService: TeamsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      throw new ForbiddenException("Authentication required");
    }

    // Get team ID from header, query, or fall back to personal team
    let teamId = request.headers["x-team-id"] || request.query?.teamId;

    if (!teamId) {
      // Fall back to personal team
      const personalTeam =
        await this.teamsService.getOrCreatePersonalTeam(userId);
      teamId = personalTeam.id;
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId)) {
      throw new BadRequestException("Invalid team ID format");
    }

    // Check membership
    const membership = await this.teamsService.getMembership(teamId, userId);
    if (!membership) {
      throw new ForbiddenException("You are not a member of this team");
    }

    // Check required roles
    const requiredRoles = this.reflector.getAllAndOverride<TeamRole[]>(
      TEAM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(membership.role)) {
        throw new ForbiddenException(
          `Requires team role: ${requiredRoles.join(" or ")}`,
        );
      }
    }

    // Attach to request for downstream use
    const team = await this.teamsService.findById(teamId);
    request.team = team;
    request.teamMember = membership;
    request.teamId = teamId;

    return true;
  }
}
