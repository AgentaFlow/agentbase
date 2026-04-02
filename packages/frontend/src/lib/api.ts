/**
 * Agentbase API Client
 * Handles all communication with the backend API and AI service.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const AI_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000/api";
const MARKETPLACE_URL =
  process.env.NEXT_PUBLIC_MARKETPLACE_URL ||
  "https://marketplace.agentbase.dev/api/v1";

class ApiClient {
  private token: string | null = null;
  private refreshTokenValue: string | null = null;
  private teamId: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("agentbase_token", token);
    }
  }

  setRefreshToken(token: string) {
    this.refreshTokenValue = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("agentbase_refresh_token", token);
    }
  }

  setTeamId(teamId: string | null) {
    this.teamId = teamId;
    if (typeof window !== "undefined") {
      if (teamId) {
        localStorage.setItem("agentbase_team_id", teamId);
      } else {
        localStorage.removeItem("agentbase_team_id");
      }
    }
  }

  getTeamId(): string | null {
    if (this.teamId) return this.teamId;
    if (typeof window !== "undefined") {
      this.teamId = localStorage.getItem("agentbase_team_id");
    }
    return this.teamId;
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("agentbase_token");
    }
    return this.token;
  }

  getRefreshToken(): string | null {
    if (this.refreshTokenValue) return this.refreshTokenValue;
    if (typeof window !== "undefined") {
      this.refreshTokenValue = localStorage.getItem("agentbase_refresh_token");
    }
    return this.refreshTokenValue;
  }

  clearToken() {
    this.token = null;
    this.refreshTokenValue = null;
    this.teamId = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("agentbase_token");
      localStorage.removeItem("agentbase_refresh_token");
      localStorage.removeItem("agentbase_team_id");
    }
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const teamId = this.getTeamId();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(teamId ? { "X-Team-Id": teamId } : {}),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshResult = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshResult.ok) {
            const data = await refreshResult.json();
            this.setToken(data.accessToken);
            if (data.refreshToken) this.setRefreshToken(data.refreshToken);
            const retryHeaders: HeadersInit = {
              ...headers,
              Authorization: `Bearer ${data.accessToken}`,
            };
            const retry = await fetch(url, {
              ...options,
              headers: retryHeaders,
            });
            if (retry.ok) {
              if (retry.status === 204) return undefined as T;
              return retry.json();
            }
          }
        } catch {
          /* refresh failed */
        }
      }
      this.clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `API error: ${response.status}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  // --- Auth ---
  async register(email: string, password: string, displayName?: string) {
    return this.request<any>(`${API_URL}/auth/register`, {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    });
  }

  async login(email: string, password: string) {
    const result = await this.request<any>(`${API_URL}/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (result.accessToken) {
      this.setToken(result.accessToken);
      if (result.refreshToken) this.setRefreshToken(result.refreshToken);
    }
    return result;
  }

  async getProfile() {
    return this.request<any>(`${API_URL}/auth/me`);
  }

  async getAuthProviders() {
    return this.request<{ providers: { name: string; enabled: boolean }[] }>(
      `${API_URL}/auth/providers`,
    );
  }

  getOAuthUrl(provider: "github" | "google"): string {
    return `${API_URL}/auth/${provider}`;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<any>(`${API_URL}/auth/change-password`, {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async requestPasswordReset(email: string) {
    return this.request<any>(`${API_URL}/auth/password-reset/request`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  // --- Users ---
  async updateProfile(data: { displayName?: string; avatarUrl?: string }) {
    return this.request<any>(`${API_URL}/users/me`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // --- Applications ---
  async getApplications() {
    return this.request<any[]>(`${API_URL}/applications`);
  }

  async createApplication(data: {
    name: string;
    description?: string;
    config?: any;
  }) {
    return this.request<any>(`${API_URL}/applications`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getApplication(id: string) {
    return this.request<any>(`${API_URL}/applications/${id}`);
  }

  async updateApplication(id: string, data: any) {
    return this.request<any>(`${API_URL}/applications/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteApplication(id: string) {
    return this.request<void>(`${API_URL}/applications/${id}`, {
      method: "DELETE",
    });
  }

  // --- Plugins (marketplace) ---
  async getPlugins() {
    return this.request<any[]>(`${API_URL}/plugins`);
  }

  async getPlugin(id: string) {
    return this.request<any>(`${API_URL}/plugins/${id}`);
  }

  // --- Installed Plugins (per app) ---
  async getInstalledPlugins(appId: string) {
    return this.request<any[]>(`${API_URL}/applications/${appId}/plugins`);
  }

  async installPlugin(appId: string, pluginId: string) {
    return this.request<any>(`${API_URL}/applications/${appId}/plugins`, {
      method: "POST",
      body: JSON.stringify({ pluginId }),
    });
  }

  async activatePlugin(appId: string, pluginId: string) {
    return this.request<any>(
      `${API_URL}/applications/${appId}/plugins/${pluginId}/activate`,
      { method: "PUT" },
    );
  }

  async deactivatePlugin(appId: string, pluginId: string) {
    return this.request<any>(
      `${API_URL}/applications/${appId}/plugins/${pluginId}/deactivate`,
      { method: "PUT" },
    );
  }

  async uninstallPlugin(appId: string, pluginId: string) {
    return this.request<void>(
      `${API_URL}/applications/${appId}/plugins/${pluginId}`,
      { method: "DELETE" },
    );
  }

  // --- Themes ---
  async getThemes() {
    return this.request<any[]>(`${API_URL}/themes`);
  }

  async applyTheme(applicationId: string, themeId: string) {
    return this.request<any>(`${API_URL}/themes`, {
      method: "POST",
      body: JSON.stringify({ applicationId, themeId }),
    });
  }

  async customizeTheme(
    applicationId: string,
    customization: Record<string, any>,
  ) {
    return this.request<any>(`${API_URL}/applications/${applicationId}`, {
      method: "PUT",
      body: JSON.stringify({ config: { themeCustomization: customization } }),
    });
  }

  async updateApplicationConfig(
    applicationId: string,
    config: Record<string, any>,
  ) {
    return this.request<any>(
      `${API_URL}/applications/${applicationId}/config`,
      {
        method: "PATCH",
        body: JSON.stringify(config),
      },
    );
  }

  async testAiConnection(provider: string, model: string) {
    const AI_URL =
      process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000/api";
    return this.request<any>(`${AI_URL}/ai/health`, {
      method: "GET",
    });
  }

  // --- Prompt Templates ---
  async getPromptTemplates(applicationId: string) {
    return this.request<any[]>(
      `${API_URL}/prompts?applicationId=${applicationId}`,
    );
  }

  async createPromptTemplate(data: {
    applicationId: string;
    name: string;
    template: string;
    variables?: string[];
    description?: string;
  }) {
    return this.request<any>(`${API_URL}/prompts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePromptTemplate(id: string, data: any) {
    return this.request<any>(`${API_URL}/prompts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePromptTemplate(id: string) {
    return this.request<void>(`${API_URL}/prompts/${id}`, { method: "DELETE" });
  }

  async setDefaultPromptTemplate(id: string, applicationId: string) {
    return this.request<any>(
      `${API_URL}/prompts/${id}/default?applicationId=${applicationId}`,
      { method: "PUT" },
    );
  }

  // --- AI ---
  async getProviders() {
    return this.request<any>(`${AI_URL}/ai/providers`);
  }

  async createConversation(
    applicationId: string,
    userId: string,
    title?: string,
  ) {
    return this.request<any>(`${AI_URL}/ai/conversations`, {
      method: "POST",
      body: JSON.stringify({
        application_id: applicationId,
        user_id: userId,
        title,
      }),
    });
  }

  async getAIConversation(conversationId: string) {
    return this.request<any>(`${AI_URL}/ai/conversations/${conversationId}`);
  }

  async getConversationsByApp(applicationId: string, limit = 20, skip = 0) {
    return this.request<any>(
      `${AI_URL}/ai/conversations/by-app/${applicationId}?limit=${limit}&skip=${skip}`,
    );
  }

  async deleteAIConversation(conversationId: string) {
    return this.request<void>(`${AI_URL}/ai/conversations/${conversationId}`, {
      method: "DELETE",
    });
  }

  async sendMessage(
    conversationId: string,
    content: string,
    options?: {
      provider?: string;
      model?: string;
      temperature?: number;
      system_prompt?: string;
    },
  ) {
    return this.request<any>(
      `${AI_URL}/ai/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ content, ...options }),
      },
    );
  }

  /**
   * Stream a message response via SSE.
   */
  streamMessage(
    conversationId: string,
    content: string,
    options: {
      provider?: string;
      model?: string;
      temperature?: number;
      system_prompt?: string;
      max_tokens?: number;
    } = {},
    callbacks: {
      onChunk: (chunk: string) => void;
      onDone: (fullResponse: string) => void;
      onError: (error: string) => void;
    },
  ): { abort: () => void } {
    const controller = new AbortController();

    const run = async () => {
      try {
        const token = this.getToken();
        const response = await fetch(
          `${AI_URL}/ai/conversations/${conversationId}/stream`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ content, ...options }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const err = await response
            .json()
            .catch(() => ({ detail: "Stream failed" }));
          callbacks.onError(err.detail || err.message || "Stream error");
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          callbacks.onError("No response body");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "chunk") callbacks.onChunk(data.content);
                else if (data.type === "done") callbacks.onDone(data.content);
                else if (data.type === "error") callbacks.onError(data.content);
              } catch {
                /* skip malformed */
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          callbacks.onError(err.message || "Stream connection failed");
        }
      }
    };

    run();
    return { abort: () => controller.abort() };
  }
  // --- API Keys ---
  async getApiKeys() {
    return this.request<any[]>(`${API_URL}/api-keys`);
  }

  async createApiKey(data: {
    name: string;
    applicationId?: string;
    scopes?: string[];
    rateLimit?: number;
  }) {
    return this.request<any>(`${API_URL}/api-keys`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async revokeApiKey(id: string) {
    return this.request<any>(`${API_URL}/api-keys/${id}/revoke`, {
      method: "POST",
    });
  }

  async deleteApiKey(id: string) {
    return this.request<void>(`${API_URL}/api-keys/${id}`, {
      method: "DELETE",
    });
  }

  // --- Analytics ---
  async getAnalytics(appId: string, days?: number) {
    return this.request<any>(
      `${API_URL}/analytics/${appId}${days ? "?days=" + days : ""}`,
    );
  }

  // --- Admin ---
  async getAdminStats() {
    return this.request<any>(`${API_URL}/admin/stats`);
  }

  async getAdminUsers() {
    return this.request<any>(`${API_URL}/admin/users`);
  }

  async updateUserRole(id: string, role: string) {
    return this.request<any>(`${API_URL}/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  }

  async updateUserStatus(id: string, isActive: boolean) {
    return this.request<any>(`${API_URL}/admin/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ isActive }),
    });
  }

  // --- Billing ---
  async getPlans() {
    return this.request<any[]>(`${API_URL}/billing/plans`);
  }

  async getUsage() {
    return this.request<any>(`${API_URL}/billing/usage`);
  }

  async createCheckout(plan: string) {
    return this.request<{ url: string }>(`${API_URL}/billing/checkout`, {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
  }

  async createPortalSession() {
    return this.request<{ url: string }>(`${API_URL}/billing/portal`, {
      method: "POST",
    });
  }

  // --- Webhooks ---
  async getWebhooks() {
    return this.request<any[]>(`${API_URL}/webhooks`);
  }

  async getWebhookEvents() {
    return this.request<string[]>(`${API_URL}/webhooks/events`);
  }

  async createWebhook(data: {
    name: string;
    url: string;
    events?: string[];
    applicationId?: string;
  }) {
    return this.request<any>(`${API_URL}/webhooks`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateWebhook(id: string, data: any) {
    return this.request<any>(`${API_URL}/webhooks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteWebhook(id: string) {
    return this.request<void>(`${API_URL}/webhooks/${id}`, {
      method: "DELETE",
    });
  }

  async toggleWebhook(id: string) {
    return this.request<any>(`${API_URL}/webhooks/${id}/toggle`, {
      method: "POST",
    });
  }

  async testWebhook(id: string) {
    return this.request<{ success: boolean; error?: string }>(
      `${API_URL}/webhooks/${id}/test`,
      { method: "POST" },
    );
  }

  // --- Marketplace ---
  async browseMarketplace(params?: {
    search?: string;
    sort?: string;
    page?: number;
  }) {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.page) qs.set("page", params.page.toString());
    return this.request<any>(`${API_URL}/marketplace/browse?${qs}`);
  }

  async getFeaturedPlugins() {
    return this.request<any[]>(`${API_URL}/marketplace/featured`);
  }

  async getMarketplaceCategories() {
    return this.request<any[]>(`${API_URL}/marketplace/categories`);
  }

  async getPluginDetail(id: string) {
    return this.request<any>(`${API_URL}/marketplace/plugins/${id}`);
  }

  async submitPluginReview(
    pluginId: string,
    data: { rating: number; review: string },
  ) {
    return this.request<any>(
      `${API_URL}/marketplace/plugins/${pluginId}/reviews`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  }

  async deletePluginReview(pluginId: string) {
    return this.request<any>(
      `${API_URL}/marketplace/plugins/${pluginId}/reviews`,
      { method: "DELETE" },
    );
  }

  // --- Plugin Updates ---

  async getUpdateCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>(
      `${API_URL}/marketplace/updates/count`,
    );
  }

  async getAvailableUpdates(): Promise<any[]> {
    return this.request<any[]>(`${API_URL}/marketplace/updates`);
  }

  async markPluginUpdated(
    installedPluginId: string,
    newVersion: string,
  ): Promise<void> {
    await this.request<any>(
      `${API_URL}/marketplace/updates/${installedPluginId}/mark-updated`,
      {
        method: "PATCH",
        body: JSON.stringify({ newVersion }),
      },
    );
  }

  // --- Marketplace Purchases (calls marketplace service directly) ---

  async createPurchaseIntent(
    pluginId: string,
    itemType: "plugin" | "theme",
  ): Promise<{ clientSecret: string }> {
    return this.request<{ clientSecret: string }>(
      `${MARKETPLACE_URL}/purchases/intent`,
      {
        method: "POST",
        body: JSON.stringify({ pluginId, itemType }),
      },
    );
  }

  async getMyPurchases(): Promise<any[]> {
    return this.request<any[]>(`${MARKETPLACE_URL}/purchases/my`);
  }

  async getMyLicenses(): Promise<any[]> {
    return this.request<any[]>(`${MARKETPLACE_URL}/licenses/my`);
  }

  async getLicenseForPlugin(pluginId: string): Promise<any | null> {
    const licenses = await this.getMyLicenses();
    return licenses.find((l) => l.pluginId === pluginId) ?? null;
  }

  // --- Marketplace Developer Portal ---

  async getDeveloperProfile(): Promise<any> {
    return this.request<any>(`${MARKETPLACE_URL}/developer/profile`);
  }

  async updateDeveloperProfile(data: {
    displayName?: string;
    bio?: string;
    websiteUrl?: string;
  }): Promise<any> {
    return this.request<any>(`${MARKETPLACE_URL}/developer/profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getDeveloperEarnings(): Promise<any> {
    return this.request<any>(`${MARKETPLACE_URL}/developer/earnings`);
  }

  async getDeveloperPayouts(): Promise<any[]> {
    return this.request<any[]>(`${MARKETPLACE_URL}/developer/payouts`);
  }

  async getMySubmissions(): Promise<any[]> {
    return this.request<any[]>(`${MARKETPLACE_URL}/submissions/my`);
  }

  async submitPluginPackage(formData: FormData): Promise<any> {
    const token = this.getToken();
    const response = await fetch(`${MARKETPLACE_URL}/submissions/plugin`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw new Error(err.message || `Upload failed: ${response.status}`);
    }
    return response.json();
  }

  async connectStripeOnboarding(): Promise<{ onboardingUrl: string }> {
    return this.request<{ onboardingUrl: string }>(
      `${MARKETPLACE_URL}/developer/connect/onboard`,
      { method: "POST" },
    );
  }

  // --- Marketplace Admin (calls marketplace service directly) ---

  async getAdminPendingSubmissions(): Promise<any[]> {
    return this.request<any[]>(`${MARKETPLACE_URL}/admin/submissions/pending`);
  }

  async approveSubmission(id: string): Promise<any> {
    return this.request<any>(
      `${MARKETPLACE_URL}/admin/submissions/${id}/approve`,
      { method: "POST" },
    );
  }

  async rejectSubmission(id: string, reason: string): Promise<any> {
    return this.request<any>(
      `${MARKETPLACE_URL}/admin/submissions/${id}/reject`,
      { method: "POST", body: JSON.stringify({ reason }) },
    );
  }

  async adminSearchLicenses(params?: { q?: string }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    return this.request<any[]>(`${MARKETPLACE_URL}/admin/licenses?${qs}`);
  }

  async adminRevokeLicense(id: string): Promise<any> {
    return this.request<any>(`${MARKETPLACE_URL}/admin/licenses/${id}/revoke`, {
      method: "POST",
    });
  }

  async adminSearchPurchases(params?: { q?: string }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    return this.request<any[]>(`${MARKETPLACE_URL}/admin/purchases?${qs}`);
  }

  async adminListDevelopers(): Promise<any[]> {
    return this.request<any[]>(`${MARKETPLACE_URL}/admin/developers`);
  }

  async adminUpdateDeveloper(
    id: string,
    data: { revenueShareTier?: string; isVerified?: boolean },
  ): Promise<any> {
    return this.request<any>(`${MARKETPLACE_URL}/admin/developers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // --- Audit ---
  async getAuditLogs(params?: {
    action?: string;
    resource?: string;
    limit?: number;
    skip?: number;
  }) {
    const qs = new URLSearchParams();
    if (params?.action) qs.set("action", params.action);
    if (params?.resource) qs.set("resource", params.resource);
    if (params?.limit) qs.set("limit", params.limit.toString());
    if (params?.skip) qs.set("skip", params.skip.toString());
    return this.request<any>(`${API_URL}/audit?${qs}`);
  }

  async getMyActivity(days?: number) {
    return this.request<any[]>(
      `${API_URL}/audit/my-activity${days ? "?days=" + days : ""}`,
    );
  }

  async getSecurityEvents(limit?: number) {
    return this.request<any[]>(
      `${API_URL}/audit/security${limit ? "?limit=" + limit : ""}`,
    );
  }

  // --- Uploads ---
  async uploadFile(file: File, folder?: string) {
    const formData = new FormData();
    formData.append("file", file);
    const qs = folder ? `?folder=${folder}` : "";
    return this.request<{
      key: string;
      url: string;
      size: number;
      mimeType: string;
    }>(`${API_URL}/uploads${qs}`, {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  // --- Teams ---
  async getTeams() {
    return this.request<any[]>(`${API_URL}/teams`);
  }

  async createTeam(data: { name: string; slug: string; description?: string }) {
    return this.request<any>(`${API_URL}/teams`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getTeam(id: string) {
    return this.request<any>(`${API_URL}/teams/${id}`);
  }

  async updateTeam(id: string, data: any) {
    return this.request<any>(`${API_URL}/teams/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id: string) {
    return this.request<void>(`${API_URL}/teams/${id}`, { method: "DELETE" });
  }

  async getTeamMembers(teamId: string) {
    return this.request<any[]>(`${API_URL}/teams/${teamId}/members`);
  }

  async inviteTeamMember(teamId: string, email: string, role?: string) {
    return this.request<any>(`${API_URL}/teams/${teamId}/members`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  }

  async removeTeamMember(teamId: string, memberId: string) {
    return this.request<void>(
      `${API_URL}/teams/${teamId}/members/${memberId}`,
      { method: "DELETE" },
    );
  }

  async updateMemberRole(teamId: string, memberId: string, role: string) {
    return this.request<any>(
      `${API_URL}/teams/${teamId}/members/${memberId}/role`,
      {
        method: "PUT",
        body: JSON.stringify({ role }),
      },
    );
  }

  // --- Knowledge Bases ---
  async getKnowledgeBases() {
    return this.request<any[]>(`${API_URL}/knowledge`);
  }

  async getKnowledgeBasesByApp(appId: string) {
    return this.request<any[]>(`${API_URL}/knowledge/app/${appId}`);
  }

  async createKnowledgeBase(data: {
    name: string;
    applicationId: string;
    description?: string;
    settings?: any;
  }) {
    return this.request<any>(`${API_URL}/knowledge`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getKnowledgeBase(id: string) {
    return this.request<any>(`${API_URL}/knowledge/${id}`);
  }

  async updateKnowledgeBase(id: string, data: any) {
    return this.request<any>(`${API_URL}/knowledge/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteKnowledgeBase(id: string) {
    return this.request<void>(`${API_URL}/knowledge/${id}`, {
      method: "DELETE",
    });
  }

  async getKnowledgeDocuments(kbId: string) {
    return this.request<any[]>(`${API_URL}/knowledge/${kbId}/documents`);
  }

  async uploadKnowledgeDocument(kbId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<any>(`${API_URL}/knowledge/${kbId}/documents`, {
      method: "POST",
      body: formData,
      headers: {},
    });
  }

  async addTextDocument(
    kbId: string,
    data: { title: string; content: string; sourceUrl?: string },
  ) {
    return this.request<any>(`${API_URL}/knowledge/${kbId}/documents/text`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteKnowledgeDocument(docId: string) {
    return this.request<void>(`${API_URL}/knowledge/documents/${docId}`, {
      method: "DELETE",
    });
  }

  async searchKnowledge(kbId: string, query: string, topK?: number) {
    return this.request<any>(`${API_URL}/knowledge/${kbId}/search`, {
      method: "POST",
      body: JSON.stringify({ query, topK }),
    });
  }

  // --- Notifications ---
  async getNotifications(params?: {
    unread?: boolean;
    category?: string;
    limit?: number;
  }) {
    const qs = new URLSearchParams();
    if (params?.unread) qs.set("unread", "true");
    if (params?.category) qs.set("category", params.category);
    if (params?.limit) qs.set("limit", params.limit.toString());
    return this.request<any>(`${API_URL}/notifications?${qs}`);
  }

  async getUnreadCount() {
    return this.request<{ unread: number }>(`${API_URL}/notifications/count`);
  }

  async markNotificationRead(id: string) {
    return this.request<any>(`${API_URL}/notifications/${id}/read`, {
      method: "POST",
    });
  }

  async markAllNotificationsRead() {
    return this.request<any>(`${API_URL}/notifications/read-all`, {
      method: "POST",
    });
  }

  async deleteNotification(id: string) {
    return this.request<void>(`${API_URL}/notifications/${id}`, {
      method: "DELETE",
    });
  }

  // --- Templates ---
  async browseTemplates(params?: {
    category?: string;
    search?: string;
    sort?: string;
    page?: number;
  }) {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.search) qs.set("search", params.search);
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.page) qs.set("page", params.page.toString());
    return this.request<any>(`${API_URL}/templates?${qs}`);
  }

  async getTemplateCategories() {
    return this.request<any[]>(`${API_URL}/templates/categories`);
  }

  async getTemplate(slug: string) {
    return this.request<any>(`${API_URL}/templates/${slug}`);
  }

  async deployTemplate(id: string) {
    return this.request<any>(`${API_URL}/templates/${id}/deploy`, {
      method: "POST",
    });
  }

  // --- Workflows ---
  async getWorkflows() {
    return this.request<any[]>(`${API_URL}/workflows`);
  }

  async getWorkflowsByApp(appId: string) {
    return this.request<any[]>(`${API_URL}/workflows/app/${appId}`);
  }

  async createWorkflow(data: {
    name: string;
    applicationId: string;
    description?: string;
  }) {
    return this.request<any>(`${API_URL}/workflows`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getWorkflow(id: string) {
    return this.request<any>(`${API_URL}/workflows/${id}`);
  }

  async updateWorkflow(id: string, data: any) {
    return this.request<any>(`${API_URL}/workflows/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async updateWorkflowCanvas(id: string, nodes: any[], edges: any[]) {
    return this.request<any>(`${API_URL}/workflows/${id}/canvas`, {
      method: "PUT",
      body: JSON.stringify({ nodes, edges }),
    });
  }

  async updateWorkflowStatus(id: string, status: string) {
    return this.request<any>(`${API_URL}/workflows/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  async deleteWorkflow(id: string) {
    return this.request<void>(`${API_URL}/workflows/${id}`, {
      method: "DELETE",
    });
  }

  async executeWorkflow(id: string, input?: Record<string, any>) {
    return this.request<any>(`${API_URL}/workflows/${id}/execute`, {
      method: "POST",
      body: JSON.stringify({ input }),
    });
  }

  async getWorkflowExecutions(id: string, limit?: number) {
    return this.request<any[]>(
      `${API_URL}/workflows/${id}/executions${limit ? "?limit=" + limit : ""}`,
    );
  }

  async getWorkflowExecution(execId: string) {
    return this.request<any>(`${API_URL}/workflows/executions/${execId}`);
  }

  async getWorkflowNodeTypes() {
    return this.request<any[]>(`${API_URL}/workflows/node-types`);
  }

  // --- Conversations ---
  async getConversations(
    appId: string,
    params?: { search?: string; limit?: number; skip?: number },
  ) {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", params.limit.toString());
    if (params?.skip) qs.set("skip", params.skip.toString());
    return this.request<any>(`${API_URL}/conversations/app/${appId}?${qs}`);
  }

  async getConversation(id: string) {
    return this.request<any>(`${API_URL}/conversations/${id}`);
  }

  async getConversationStats(appId: string) {
    return this.request<any>(`${API_URL}/conversations/app/${appId}/stats`);
  }

  async deleteConversation(id: string) {
    return this.request<void>(`${API_URL}/conversations/${id}`, {
      method: "DELETE",
    });
  }

  async bulkDeleteConversations(ids: string[]) {
    return this.request<any>(`${API_URL}/conversations/bulk-delete`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  }

  // --- Custom Domains ---
  async getCustomDomains() {
    return this.request<any[]>(`${API_URL}/custom-domains`);
  }

  async addCustomDomain(data: { domain: string; applicationId?: string }) {
    return this.request<any>(`${API_URL}/custom-domains`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async verifyDomain(id: string) {
    return this.request<any>(`${API_URL}/custom-domains/${id}/verify`, {
      method: "POST",
    });
  }

  async updateDomain(id: string, data: any) {
    return this.request<any>(`${API_URL}/custom-domains/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteDomain(id: string) {
    return this.request<void>(`${API_URL}/custom-domains/${id}`, {
      method: "DELETE",
    });
  }

  async getDomainDns(id: string) {
    return this.request<any>(`${API_URL}/custom-domains/${id}/dns`);
  }

  // --- Branding ---
  async getBranding() {
    return this.request<any>(`${API_URL}/branding`);
  }

  async updateBranding(data: any) {
    // Strip read-only metadata fields — only send fields accepted by UpdateBrandingDto
    const {
      id,
      ownerId,
      teamId,
      owner,
      team,
      createdAt,
      updatedAt,
      ...payload
    } = data;
    return this.request<any>(`${API_URL}/branding`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  // --- SSO ---
  async getSsoConfigs() {
    return this.request<any[]>(`${API_URL}/sso`);
  }

  async createSsoConfig(data: any) {
    return this.request<any>(`${API_URL}/sso`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSsoConfig(id: string, data: any) {
    return this.request<any>(`${API_URL}/sso/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async toggleSso(id: string) {
    return this.request<any>(`${API_URL}/sso/${id}/toggle`, { method: "POST" });
  }

  async deleteSso(id: string) {
    return this.request<void>(`${API_URL}/sso/${id}`, { method: "DELETE" });
  }

  // --- Data Export/Import ---
  async exportData(resource: string, format: string, applicationId?: string) {
    const qs = new URLSearchParams({ resource, format });
    if (applicationId) qs.set("applicationId", applicationId);
    // Returns raw response for blob download — use getToken() for correct key
    const token = this.getToken();
    const res = await fetch(`${API_URL}/data/export?${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res;
  }

  async importData(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<any>(`${API_URL}/data/import`, {
      method: "POST",
      body: formData,
      headers: {},
    });
  }

  // --- Model Configs ---
  async getModelConfigs(applicationId: string) {
    return this.request<any[]>(
      `${API_URL}/model-configs?applicationId=${applicationId}`,
    );
  }

  async createModelConfig(data: {
    applicationId: string;
    name: string;
    provider: string;
    modelId: string;
    isDefault?: boolean;
    settings?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      systemPrompt?: string;
    };
  }) {
    return this.request<any>(`${API_URL}/model-configs`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteModelConfig(id: string) {
    return this.request<void>(`${API_URL}/model-configs/${id}`, {
      method: "DELETE",
    });
  }

  async setDefaultModelConfig(id: string) {
    return this.request<any>(`${API_URL}/model-configs/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isDefault: true }),
    });
  }

  // --- System Health ---
  async getSystemHealth() {
    return this.request<any>(`${API_URL}/system/health`);
  }

  async getPlatformStats() {
    return this.request<any>(`${API_URL}/system/stats`);
  }

  // --- Provider Keys (BYOK — Bring Your Own Key) ---

  /** List all saved provider key hints for the current user (no raw keys returned). */
  async getProviderKeys(): Promise<
    Array<{
      provider: string;
      keyHint: string;
      isActive: boolean;
      lastUsedAt: string | null;
      lastValidatedAt: string | null;
      createdAt: string;
    }>
  > {
    return this.request<any[]>(`${API_URL}/provider-keys`);
  }

  /** Save (or replace) a provider API key — stored encrypted on the server. */
  async saveProviderKey(
    provider: string,
    apiKey: string,
  ): Promise<{
    provider: string;
    keyHint: string;
    isActive: boolean;
    lastUsedAt: string | null;
    lastValidatedAt: string | null;
    createdAt: string;
  }> {
    return this.request<any>(`${API_URL}/provider-keys/${provider}`, {
      method: "PUT",
      body: JSON.stringify({ provider, apiKey }),
    });
  }

  /** Remove a saved provider key. */
  async deleteProviderKey(provider: string): Promise<void> {
    return this.request<void>(`${API_URL}/provider-keys/${provider}`, {
      method: "DELETE",
    });
  }

  /** Validate a saved key against the live provider API. */
  async validateProviderKey(
    provider: string,
  ): Promise<{ valid: boolean; error?: string }> {
    return this.request<{ valid: boolean; error?: string }>(
      `${API_URL}/provider-keys/${provider}/validate`,
      { method: "POST" },
    );
  }
}

export const api = new ApiClient();
export default api;
