import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getCredentials, getGroup, listGroups } from '../client.js';
import type { CallToolResult } from './types.js';
import { errorResult, GET_OBJECT_PARAMS_PROPERTIES, LIST_PARAMS_PROPERTIES, requireCredentials, textResult } from './shared.js';

export const GROUP_TOOLS: Tool[] = [
  {
    name: 'prtg_list_groups',
    description:
      "List groups (the organizational folders that contain devices). Each group's `id` chains into prtg_get_group and prtg_get_object_sensor_summary.",
    inputSchema: {
      type: 'object',
      properties: { ...LIST_PARAMS_PROPERTIES },
    },
  },
  {
    name: 'prtg_get_group',
    description: 'Get the metrics and settings of a single group by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Group ID (from prtg_list_groups).' },
        ...GET_OBJECT_PARAMS_PROPERTIES,
      },
      required: ['id'],
    },
  },
];

const TOOL_NAMES = new Set(GROUP_TOOLS.map((t) => t.name));
export function isGroupTool(name: string): boolean {
  return TOOL_NAMES.has(name);
}

export async function handleGroupTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const creds = getCredentials();
  const missing = requireCredentials(creds);
  if (missing) return missing;

  try {
    if (name === 'prtg_list_groups') {
      return textResult(
        await listGroups(creds!, {
          offset: args.offset as number | undefined,
          limit: args.limit as number | undefined,
          filter: args.filter as string | undefined,
          sort_by: args.sort_by as string | undefined,
        })
      );
    }

    if (name === 'prtg_get_group') {
      return textResult(
        await getGroup(creds!, { id: args.id as string, include: args.include as string | undefined })
      );
    }

    return errorResult(`Unknown tool: ${name}`);
  } catch (err) {
    return errorResult((err as Error).message);
  }
}
