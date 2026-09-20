import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleSensorTool } from '../tools/sensors.js';
import { runWithCredentials } from '../client.js';
import { jsonResponse, textOf } from './test-helpers.js';

describe('handleSensorTool', () => {
  const fetchMock = vi.fn();
  const creds = { apiKey: 'key-1', baseUrl: 'https://prtg.example.com' };

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prtg_list_sensors sends the Bearer token and forwards filters', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ objid: 100, name: 'Ping', status: 'Up' }]));

    const result = await runWithCredentials(creds, () =>
      handleSensorTool('prtg_list_sensors', { filter: "status == 'Down'" })
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe('/api/v2/sensors');
    expect(new URL(url).searchParams.get('filter')).toBe("status == 'Down'");
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer key-1');
    expect(result.isError).toBeUndefined();
  });

  it('prtg_get_sensor scopes the request to the sensor ID', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ objid: 100, name: 'Ping' }));

    const result = await runWithCredentials(creds, () => handleSensorTool('prtg_get_sensor', { id: '100' }));

    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe('/api/v2/sensors/100');
    expect(result.isError).toBeUndefined();
  });

  it('prtg_get_sensor_data requests the /data sub-resource and forwards pagination', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ datetime: '2026-09-20 00:00:00', value: [{ value: '1' }] }]));

    const result = await runWithCredentials(creds, () =>
      handleSensorTool('prtg_get_sensor_data', { id: '100', limit: 10 })
    );

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api/v2/sensors/100/data');
    expect(url.searchParams.get('limit')).toBe('10');
    expect(result.isError).toBeUndefined();
  });

  it('prtg_list_alarms requests /sensors/alarms and forwards include_all_channels', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ objid: 100, name: 'Ping', status: 'Down' }]));

    const result = await runWithCredentials(creds, () =>
      handleSensorTool('prtg_list_alarms', { include_all_channels: true })
    );

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api/v2/sensors/alarms');
    expect(url.searchParams.get('include_all_channels')).toBe('true');
    expect(result.isError).toBeUndefined();
  });

  it('surfaces a 429 as a readable rate-limit error rather than throwing', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'rate limited' }, 429));

    const result = await runWithCredentials(creds, () => handleSensorTool('prtg_list_sensors', {}));

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/rate-limited/i);
  });

  it('returns a credential error without calling fetch when no key/baseUrl is configured', async () => {
    const result = await handleSensorTool('prtg_list_sensors', {});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/PRTG_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
