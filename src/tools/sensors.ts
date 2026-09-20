import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getCredentials, getSensor, getSensorData, listAlarms, listSensors } from '../client.js';
import type { CallToolResult } from './types.js';
import { errorResult, GET_OBJECT_PARAMS_PROPERTIES, LIST_PARAMS_PROPERTIES, requireCredentials, textResult } from './shared.js';

export const SENSOR_TOOLS: Tool[] = [
  {
    name: 'prtg_list_sensors',
    description:
      "List sensors (the individual checks - ping, HTTP, SNMP, etc. - attached to a device), with their current status. Each sensor's `id` chains into prtg_get_sensor and prtg_get_sensor_data.",
    inputSchema: {
      type: 'object',
      properties: { ...LIST_PARAMS_PROPERTIES },
    },
  },
  {
    name: 'prtg_get_sensor',
    description: 'Get the metrics and settings of a single sensor by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Sensor ID (from prtg_list_sensors or prtg_list_alarms).' },
        ...GET_OBJECT_PARAMS_PROPERTIES,
      },
      required: ['id'],
    },
  },
  {
    name: 'prtg_get_sensor_data',
    description: "Get channel measurement history (the actual monitoring/performance data) for a sensor.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Sensor ID (from prtg_list_sensors or prtg_list_alarms).' },
        ...LIST_PARAMS_PROPERTIES,
      },
      required: ['id'],
    },
  },
  {
    name: 'prtg_list_alarms',
    description:
      "List sensors currently in a Down/Warning/Unusual/etc. alarm state that match a filter. PRTG's alerting surface - use this to find what's currently wrong.",
    inputSchema: {
      type: 'object',
      properties: {
        include_all_channels: {
          type: 'boolean',
          description:
            "Include all channels per sensor. When false (default), only the primary channel and the Downtime channel are included.",
        },
        ...LIST_PARAMS_PROPERTIES,
      },
    },
  },
];

const TOOL_NAMES = new Set(SENSOR_TOOLS.map((t) => t.name));
export function isSensorTool(name: string): boolean {
  return TOOL_NAMES.has(name);
}

export async function handleSensorTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const creds = getCredentials();
  const missing = requireCredentials(creds);
  if (missing) return missing;

  try {
    if (name === 'prtg_list_sensors') {
      return textResult(
        await listSensors(creds!, {
          offset: args.offset as number | undefined,
          limit: args.limit as number | undefined,
          filter: args.filter as string | undefined,
          sort_by: args.sort_by as string | undefined,
        })
      );
    }

    if (name === 'prtg_get_sensor') {
      return textResult(
        await getSensor(creds!, { id: args.id as string, include: args.include as string | undefined })
      );
    }

    if (name === 'prtg_get_sensor_data') {
      return textResult(
        await getSensorData(creds!, {
          id: args.id as string,
          offset: args.offset as number | undefined,
          limit: args.limit as number | undefined,
          filter: args.filter as string | undefined,
          sort_by: args.sort_by as string | undefined,
        })
      );
    }

    if (name === 'prtg_list_alarms') {
      return textResult(
        await listAlarms(creds!, {
          include_all_channels: args.include_all_channels as boolean | undefined,
          offset: args.offset as number | undefined,
          limit: args.limit as number | undefined,
          filter: args.filter as string | undefined,
          sort_by: args.sort_by as string | undefined,
        })
      );
    }

    return errorResult(`Unknown tool: ${name}`);
  } catch (err) {
    return errorResult((err as Error).message);
  }
}
