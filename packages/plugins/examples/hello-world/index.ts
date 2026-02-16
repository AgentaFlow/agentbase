/**
 * Hello World Plugin
 *
 * A minimal example plugin demonstrating the Agentbase plugin structure.
 */
import { createPlugin } from '../../sdk/src';

export default createPlugin({
  name: 'hello-world',
  version: '1.0.0',
  description: 'A minimal example plugin for Agentbase',
  author: 'Agentbase Team',

  hooks: {
    'app:init': async (context) => {
      context.api.log('Hello World plugin initialized!');
    },
    'conversation:beforeMessage': async (context, message) => {
      context.api.log(`Processing message: ${message.content.substring(0, 50)}...`);
    },
  },

  filters: {
    'response:modify': async (context, response) => {
      // Example: append a signature to AI responses
      return response;
    },
  },

  settings: {
    greeting: {
      type: 'string',
      label: 'Custom Greeting',
      default: 'Hello from the plugin!',
    },
    enabled: {
      type: 'boolean',
      label: 'Enable Greeting',
      default: true,
    },
  },

  onActivate: async (context) => {
    context.api.log('Hello World plugin activated!');
  },

  onDeactivate: async (context) => {
    context.api.log('Hello World plugin deactivated');
  },
});
