import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { CHANNEL_TOOLS, handleChannelTool, isChannelTool } from './channels.js';
import { DEVICE_TOOLS, handleDeviceTool, isDeviceTool } from './devices.js';
import { GROUP_TOOLS, handleGroupTool, isGroupTool } from './groups.js';
import { PROBE_TOOLS, handleProbeTool, isProbeTool } from './probes.js';
import { SENSOR_TOOLS, handleSensorTool, isSensorTool } from './sensors.js';
import { SUMMARY_TOOLS, handleSummaryTool, isSummaryTool } from './summary.js';
import { SYSTEM_TOOLS, handleSystemTool, isSystemTool } from './system.js';
import type { CallToolResult } from './types.js';

export const ALL_TOOLS: Tool[] = [
  ...DEVICE_TOOLS,
  ...GROUP_TOOLS,
  ...PROBE_TOOLS,
  ...SENSOR_TOOLS,
  ...SUMMARY_TOOLS,
  ...CHANNEL_TOOLS,
  ...SYSTEM_TOOLS,
];

export async function dispatchToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  if (isDeviceTool(name)) return handleDeviceTool(name, args);
  if (isGroupTool(name)) return handleGroupTool(name, args);
  if (isProbeTool(name)) return handleProbeTool(name, args);
  if (isSensorTool(name)) return handleSensorTool(name, args);
  if (isSummaryTool(name)) return handleSummaryTool(name, args);
  if (isChannelTool(name)) return handleChannelTool(name, args);
  if (isSystemTool(name)) return handleSystemTool(name, args);
  return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
}
