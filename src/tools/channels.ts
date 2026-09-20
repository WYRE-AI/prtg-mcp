import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getChannel, getCredentials } from '../client.js';
import type { CallToolResult } from './types.js';
import { errorResult, GET_OBJECT_PARAMS_PROPERTIES, requireCredentials, textResult } from './shared.js';

export const CHANNEL_TOOLS: Tool[] = [
  {
    name: 'prtg_get_channel',
    description:
      'Get the metrics and settings (units, limits, current value) of a single channel on a sensor by ID. Channel IDs appear in prtg_get_sensor_data and prtg_get_sensor results.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Channel ID.' },
        ...GET_OBJECT_PARAMS_PROPERTIES,
      },
      required: ['id'],
    },
  },
];

const TOOL_NAMES = new Set(CHANNEL_TOOLS.map((t) => t.name));
export function isChannelTool(name: string): boolean {
  return TOOL_NAMES.has(name);
}

export async function handleChannelTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const creds = getCredentials();
  const missing = requireCredentials(creds);
  if (missing) return missing;

  try {
    if (name === 'prtg_get_channel') {
      return textResult(
        await getChannel(creds!, { id: args.id as string, include: args.include as string | undefined })
      );
    }

    return errorResult(`Unknown tool: ${name}`);
  } catch (err) {
    return errorResult((err as Error).message);
  }
}
