import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getCredentials, getProbe, getProbeNetworkInfo, listProbes } from '../client.js';
import type { CallToolResult } from './types.js';
import { errorResult, GET_OBJECT_PARAMS_PROPERTIES, LIST_PARAMS_PROPERTIES, requireCredentials, textResult } from './shared.js';

export const PROBE_TOOLS: Tool[] = [
  {
    name: 'prtg_list_probes',
    description:
      "List probes (the monitoring agents - local, remote, or mini - that run the actual sensor checks). Each probe's `id` chains into prtg_get_probe, prtg_get_probe_network_info, and prtg_get_object_sensor_summary.",
    inputSchema: {
      type: 'object',
      properties: { ...LIST_PARAMS_PROPERTIES },
    },
  },
  {
    name: 'prtg_get_probe',
    description: 'Get the metrics and settings of a single probe by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Probe ID (from prtg_list_probes).' },
        ...GET_OBJECT_PARAMS_PROPERTIES,
      },
      required: ['id'],
    },
  },
  {
    name: 'prtg_get_probe_network_info',
    description: "Get network information (the probe host's own connectivity details) for a probe.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Probe ID (from prtg_list_probes).' },
      },
      required: ['id'],
    },
  },
];

const TOOL_NAMES = new Set(PROBE_TOOLS.map((t) => t.name));
export function isProbeTool(name: string): boolean {
  return TOOL_NAMES.has(name);
}

export async function handleProbeTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const creds = getCredentials();
  const missing = requireCredentials(creds);
  if (missing) return missing;

  try {
    if (name === 'prtg_list_probes') {
      return textResult(
        await listProbes(creds!, {
          offset: args.offset as number | undefined,
          limit: args.limit as number | undefined,
          filter: args.filter as string | undefined,
          sort_by: args.sort_by as string | undefined,
        })
      );
    }

    if (name === 'prtg_get_probe') {
      return textResult(
        await getProbe(creds!, { id: args.id as string, include: args.include as string | undefined })
      );
    }

    if (name === 'prtg_get_probe_network_info') {
      return textResult(await getProbeNetworkInfo(creds!, args.id as string));
    }

    return errorResult(`Unknown tool: ${name}`);
  } catch (err) {
    return errorResult((err as Error).message);
  }
}
