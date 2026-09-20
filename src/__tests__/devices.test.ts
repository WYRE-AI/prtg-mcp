import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleDeviceTool } from '../tools/devices.js';
import { runWithCredentials } from '../client.js';
import { jsonResponse, textOf } from './test-helpers.js';

describe('handleDeviceTool', () => {
  const fetchMock = vi.fn();
  const creds = { apiKey: 'key-1', baseUrl: 'https://prtg.example.com' };

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prtg_list_devices sends the Bearer token and forwards filters', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ objid: 1, name: 'router-1' }]));

    const result = await runWithCredentials(creds, () =>
      handleDeviceTool('prtg_list_devices', { filter: "status == 'Down'", sensor_status_summary: true })
    );

    expect(result.isError).toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe('/api/v2/devices');
    expect(new URL(url).searchParams.get('filter')).toBe("status == 'Down'");
    expect(new URL(url).searchParams.get('sensor_status_summary')).toBe('true');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer key-1');
    expect(JSON.parse(textOf(result))[0].name).toBe('router-1');
  });

  it('prtg_get_device scopes the request to the device ID in the path', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ objid: 5, name: 'switch-1' }));

    const result = await runWithCredentials(creds, () => handleDeviceTool('prtg_get_device', { id: '5' }));

    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe('/api/v2/devices/5');
    expect(result.isError).toBeUndefined();
  });

  it('surfaces a 401 as a readable auth error rather than throwing', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'unauthorized' }, 401));

    const result = await runWithCredentials(creds, () => handleDeviceTool('prtg_list_devices', {}));

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/rejected the request/i);
  });

  it('returns a credential error without calling fetch when no key/baseUrl is configured', async () => {
    const result = await handleDeviceTool('prtg_list_devices', {});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/PRTG_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
