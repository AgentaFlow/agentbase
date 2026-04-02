/**
 * {{PLUGIN_NAME}}
 *
 * TODO: Add a description of what this plugin does.
 *
 * @package @agentbase/plugin-{{PLUGIN_SLUG}}
 * @version {{PLUGIN_VERSION}}
 */
import { createPlugin, PluginContext } from "@agentbase/plugin-sdk";

export default createPlugin({
  name: "{{PLUGIN_SLUG}}",
  version: "{{PLUGIN_VERSION}}",
  description: "TODO: Describe your plugin",
  author: "Your Name",

  // ── Settings ──────────────────────────────────────────────────────────────
  // Accessible at runtime via context.api.getConfig('<key>')
  settings: {
    enabled: {
      type: "boolean",
      label: "Enable Plugin",
      default: true,
    },
    // exampleText: {
    //   type: 'string',
    //   label: 'Example Text Setting',
    //   default: '',
    // },
    // exampleSelect: {
    //   type: 'select',
    //   label: 'Example Select',
    //   options: ['option-a', 'option-b', 'option-c'],
    //   default: 'option-a',
    // },
  },

  // ── Hooks ─────────────────────────────────────────────────────────────────
  // Side-effect callbacks. Return value is ignored.
  // Available: app:init, conversation:start, conversation:end,
  //            conversation:beforeMessage, plugin:activate, plugin:deactivate,
  //            user:login, user:register
  hooks: {
    "app:init": async (context: PluginContext) => {
      context.api.log("{{PLUGIN_NAME}} initialized");
    },

    // 'conversation:start': async (context, conversation) => { ... },
    // 'conversation:beforeMessage': async (context, message) => { ... },
    // 'conversation:end': async (context, conversation) => { ... },
  },

  // ── Filters ───────────────────────────────────────────────────────────────
  // Transform callbacks. Must return the (modified) value.
  // Available: response:modify, prompt:modify,
  //            message:beforeSend, message:afterReceive
  filters: {
    // 'prompt:modify': async (context, prompt) => {
    //   return prompt;
    // },
    // 'response:modify': async (context, response) => {
    //   return response;
    // },
  },

  // ── Custom Endpoints ──────────────────────────────────────────────────────
  // Registered at /api/plugins/<pluginId>/endpoints/<path>
  endpoints: [
    // {
    //   method: 'GET',
    //   path: '/status',
    //   auth: true,
    //   description: 'Returns plugin status',
    //   handler: async (req, res) => {
    //     res.json({ ok: true });
    //   },
    // },
  ],

  // ── Cron Jobs ─────────────────────────────────────────────────────────────
  cronJobs: [
    // {
    //   name: '{{PLUGIN_SLUG}}-hourly',
    //   schedule: '0 * * * *',
    //   handler: async (context) => {
    //     context.api.log('Cron tick');
    //   },
    // },
  ],

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  onActivate: async (context: PluginContext) => {
    context.api.log("{{PLUGIN_NAME}} activated");
    // Run one-time setup: seed plugin DB defaults, validate config, etc.
  },

  onDeactivate: async (context: PluginContext) => {
    context.api.log("{{PLUGIN_NAME}} deactivated");
    // Cleanup: cancel subscriptions, flush state, etc.
  },
});
