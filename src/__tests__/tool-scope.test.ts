import { describe, expect, it } from 'vitest';
import { ALL_TOOLS } from '../tools/index.js';

/**
 * Hard scope boundary (see README's Scope section): this connector must
 * NEVER expose a tool that pauses/resumes/scans/acknowledges an object, or
 * that creates/updates/deletes/clones/moves/discovers anything - PRTG API
 * v2 exposes all of those as documented endpoints, and none of them belong
 * in a read-only connector. Pin the exact tool set so an accidental
 * addition - a copy-pasted "pause_sensor", "acknowledge_sensor",
 * "scan_device_now", "clone_device", or any other write tool - fails this
 * test immediately rather than silently shipping.
 */
describe('ALL_TOOLS scope boundary', () => {
  const EXPECTED_TOOL_NAMES = [
    // Devices
    'prtg_list_devices',
    'prtg_get_device',
    // Groups
    'prtg_list_groups',
    'prtg_get_group',
    // Probes
    'prtg_list_probes',
    'prtg_get_probe',
    'prtg_get_probe_network_info',
    // Sensors
    'prtg_list_sensors',
    'prtg_get_sensor',
    'prtg_get_sensor_data',
    'prtg_list_alarms',
    // Sensor status summary
    'prtg_get_sensor_status_summary',
    'prtg_get_object_sensor_summary',
    // Channels
    'prtg_get_channel',
    // System
    'prtg_get_version',
  ].sort();

  it("exposes exactly this connector's 15 read-only tools - nothing more, nothing less", () => {
    const names = ALL_TOOLS.map((t) => t.name).sort();
    expect(names).toEqual(EXPECTED_TOOL_NAMES);
    expect(names).toHaveLength(15);
  });

  it('never exposes a write, pause/resume/scan, acknowledge, or discovery tool', () => {
    // Forbidden as a whole underscore-token, not a substring - so this does
    // NOT false-positive on legitimate tokens like 'status' or 'summary'.
    const FORBIDDEN_TOKENS = new Set([
      'pause',
      'resume',
      'scan',
      'acknowledge',
      'create',
      'update',
      'delete',
      'clone',
      'move',
      'discover',
      'discovery',
      'reset',
      'login',
      'logout',
    ]);

    for (const tool of ALL_TOOLS) {
      const tokens = tool.name.split('_');
      for (const token of tokens) {
        expect(
          FORBIDDEN_TOKENS.has(token),
          `Tool "${tool.name}" contains forbidden token "${token}" - this connector must stay read-only.`
        ).toBe(false);
      }
    }
  });

  it('every tool name is prefixed with prtg_', () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.name.startsWith('prtg_')).toBe(true);
    }
  });
});
