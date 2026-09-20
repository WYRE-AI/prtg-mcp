import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getCredentials, getObjectSensorSummary, getSensorStatusSummary } from '../client.js';
import type { CallToolResult } from './types.js';
import { errorResult, requireCredentials, textResult } from './shared.js';

export const SUMMARY_TOOLS: Tool[] = [
  {
    name: 'prtg_get_sensor_status_summary',
    description: 'Get a summary of all sensor states (counts by status - Up, Down, Warning, Paused, etc.) across the whole PRTG instance.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'prtg_get_object_sensor_summary',
    description: 'Get a sensor-state summary scoped to one probe, group, or device.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Probe, group, or device ID (from prtg_list_probes, prtg_list_groups, or prtg_list_devices).',
        },
      },
      required: ['id'],
    },
  },
];

const TOOL_NAMES = new Set(SUMMARY_TOOLS.map((t) => t.name));
export function isSummaryTool(name: string): boolean {
  return TOOL_NAMES.has(name);
}

export async function handleSummaryTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const creds = getCredentials();
  const missing = requireCredentials(creds);
  if (missing) return missing;

  try {
    if (name === 'prtg_get_sensor_status_summary') {
      return textResult(await getSensorStatusSummary(creds!));
    }

    if (name === 'prtg_get_object_sensor_summary') {
      return textResult(await getObjectSensorSummary(creds!, args.id as string));
    }

    return errorResult(`Unknown tool: ${name}`);
  } catch (err) {
    return errorResult((err as Error).message);
  }
}
