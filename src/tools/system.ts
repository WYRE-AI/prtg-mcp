import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getCredentials, getVersion } from '../client.js';
import type { CallToolResult } from './types.js';
import { errorResult, requireCredentials, textResult } from './shared.js';

export const SYSTEM_TOOLS: Tool[] = [
  {
    name: 'prtg_get_version',
    description:
      'Get the PRTG core server and appserver version. Useful as a quick credential/connectivity sanity check.',
    inputSchema: { type: 'object', properties: {} },
  },
];

const TOOL_NAMES = new Set(SYSTEM_TOOLS.map((t) => t.name));
export function isSystemTool(name: string): boolean {
  return TOOL_NAMES.has(name);
}

export async function handleSystemTool(name: string, _args: Record<string, unknown>): Promise<CallToolResult> {
  const creds = getCredentials();
  const missing = requireCredentials(creds);
  if (missing) return missing;

  try {
    if (name === 'prtg_get_version') {
      return textResult(await getVersion(creds!));
    }

    return errorResult(`Unknown tool: ${name}`);
  } catch (err) {
    return errorResult((err as Error).message);
  }
}
