/**
 * Custom API Endpoint Plugin
 *
 * Demonstrates how to register custom API endpoints that extend
 * the Agentbase platform. This plugin adds a /api/sentiment endpoint
 * that analyzes the sentiment of text using the configured AI provider.
 */
import { createPlugin } from "../../sdk/src";

export default createPlugin({
  name: "custom-api-sentiment",
  version: "1.0.0",
  description: "Adds a custom /sentiment API endpoint for text analysis",
  author: "Agentbase Team",

  hooks: {
    "app:init": async (context) => {
      context.api.log("Sentiment API plugin initialized");
    },

    /**
     * Register a custom endpoint handler.
     * When the hook system receives a request to /api/plugins/sentiment/analyze,
     * this handler processes it and returns sentiment analysis.
     */
    "api:request:/sentiment/analyze": async (context, request) => {
      const { text } = request.body || {};

      if (!text || typeof text !== "string") {
        return {
          status: 400,
          body: { error: "Missing required field: text" },
        };
      }

      // Use the plugin API to make a request to the AI provider
      try {
        const result = await context.api.makeRequest("/api/ai/conversations", {
          method: "POST",
          body: {
            title: "Sentiment Analysis",
            system_prompt:
              "You are a sentiment analysis tool. Respond ONLY with a JSON object with fields: sentiment (positive|negative|neutral), confidence (0-1), and summary (one sentence).",
          },
        });

        // Send the text for analysis
        const analysis = await context.api.makeRequest(
          `/api/ai/conversations/${result.id}/messages`,
          {
            method: "POST",
            body: { content: `Analyze the sentiment of this text: "${text}"` },
          },
        );

        return {
          status: 200,
          body: {
            text: text.slice(0, 100),
            analysis: analysis.response,
            usage: analysis.usage,
          },
        };
      } catch (err: any) {
        return {
          status: 500,
          body: { error: "Analysis failed", details: err.message },
        };
      }
    },

    /**
     * Register a simple GET endpoint for health/status.
     */
    "api:request:/sentiment/health": async () => {
      return {
        status: 200,
        body: {
          status: "ok",
          plugin: "custom-api-sentiment",
          version: "1.0.0",
        },
      };
    },
  },

  filters: {
    /**
     * Register the custom routes in the API route registry.
     * This filter is applied when the platform collects available routes.
     */
    "api:routes": async (_context, routes: any[]) => {
      return [
        ...routes,
        {
          method: "POST",
          path: "/sentiment/analyze",
          description: "Analyze text sentiment using AI",
          plugin: "custom-api-sentiment",
        },
        {
          method: "GET",
          path: "/sentiment/health",
          description: "Sentiment plugin health check",
          plugin: "custom-api-sentiment",
        },
      ];
    },
  },

  settings: {
    maxTextLength: {
      type: "number",
      label: "Maximum text length for analysis",
      default: 5000,
    },
    defaultModel: {
      type: "string",
      label: "Preferred AI model for analysis",
      default: "gpt-4o-mini",
    },
  },

  onActivate: async (context) => {
    context.api.log("Sentiment API endpoints registered");
  },

  onDeactivate: async (context) => {
    context.api.log("Sentiment API endpoints removed");
  },
});
