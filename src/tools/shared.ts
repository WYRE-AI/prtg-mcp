import type { PrtgCredentials } from '../types.js';
import type { CallToolResult } from './types.js';

export function textResult(value: unknown): CallToolResult {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: 'text', text }] };
}

export function errorResult(message: string): CallToolResult {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

/** Returns an error CallToolResult if credentials are missing, else null. */
export function requireCredentials(creds: PrtgCredentials | null): CallToolResult | null {
  if (!creds) {
    return errorResult('No PRTG credentials configured. Set PRTG_API_KEY and PRTG_BASE_URL.');
  }
  return null;
}

/** Shared input-schema fragment for the offset/limit/filter/sort_by-paginated list endpoints (every PRTG API v2 list endpoint). */
export const LIST_PARAMS_PROPERTIES = {
  offset: { type: 'number', description: 'Zero-based offset into the result set. Defaults to 0.' },
  limit: { type: 'number', description: 'Number of objects to return (max 3000). Defaults to 100.' },
  filter: {
    type: 'string',
    description: "PRTG filter expression to narrow results, e.g. \"status == 'Down'\". See PRTG API v2 Overview: Filters.",
  },
  sort_by: {
    type: 'string',
    description:
      "Comma-separated list of fields to sort by. Ascending by default; prefix a field with '-' for descending.",
  },
} as const;

/** Shared input-schema fragment for the `id` + `include` params on every PRTG API v2 single-object GET endpoint. */
export const GET_OBJECT_PARAMS_PROPERTIES = {
  include: {
    type: 'string',
    description:
      "Comma-separated list of additional settings sections to include, e.g. 'all_sections' or 'path'. Omit for just the most relevant fields.",
  },
} as const;
