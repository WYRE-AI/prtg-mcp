import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getCredentials, getDevice, listDevices } from '../client.js';
import type { CallToolResult } from './types.js';
import { errorResult, GET_OBJECT_PARAMS_PROPERTIES, LIST_PARAMS_PROPERTIES, requireCredentials, textResult } from './shared.js';

export const DEVICE_TOOLS: Tool[] = [
  {
    name: 'prtg_list_devices',
    description:
      "List monitored devices (hostname/IP, status, parent group/probe). Each device's `id` chains into prtg_get_device, prtg_list_sensors (filter by parent), and prtg_get_object_sensor_summary.",
    inputSchema: {
      type: 'object',
      properties: {
        sensor_status_summary: {
          type: 'boolean',
          description: 'Include a sensor-status-summary breakdown for each device. Defaults to false.',
        },
        ...LIST_PARAMS_PROPERTIES,
      },
    },
  },
  {
    name: 'prtg_get_device',
    description: 'Get the metrics and settings of a single device by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Device ID (from prtg_list_devices).' },
        ...GET_OBJECT_PARAMS_PROPERTIES,
      },
      required: ['id'],
    },
  },
];

const TOOL_NAMES = new Set(DEVICE_TOOLS.map((t) => t.name));
export function isDeviceTool(name: string): boolean {
  return TOOL_NAMES.has(name);
}

export async function handleDeviceTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const creds = getCredentials();
  const missing = requireCredentials(creds);
  if (missing) return missing;

  try {
    if (name === 'prtg_list_devices') {
      return textResult(
        await listDevices(creds!, {
          sensor_status_summary: args.sensor_status_summary as boolean | undefined,
          offset: args.offset as number | undefined,
          limit: args.limit as number | undefined,
          filter: args.filter as string | undefined,
          sort_by: args.sort_by as string | undefined,
        })
      );
    }

    if (name === 'prtg_get_device') {
      return textResult(
        await getDevice(creds!, { id: args.id as string, include: args.include as string | undefined })
      );
    }

    return errorResult(`Unknown tool: ${name}`);
  } catch (err) {
    return errorResult((err as Error).message);
  }
}
