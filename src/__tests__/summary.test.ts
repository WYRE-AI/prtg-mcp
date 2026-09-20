import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleSummaryTool } from '../tools/summary.js';
import { runWithCredentials } from '../client.js';
import { jsonResponse, textOf } from './test-helpers.js';

describe('handleSummaryTool', () => {
  const fetchMock = vi.fn();
  const creds = { apiKey: 'key-1', baseUrl: 'https://prtg.example.com' };

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prtg_get_sensor_status_summary requests the global summary', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ up: 10, down: 1 }));

    const result = await runWithCredentials(creds, () => handleSummaryTool('prtg_get_sensor_status_summary', {}));

    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe('/api/v2/sensor-status-summary');
    expect(result.isError).toBeUndefined();
  });

  it('prtg_get_object_sensor_summary scopes the request to the object ID', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ up: 5, down: 0 }));

    const result = await runWithCredentials(creds, () =>
      handleSummaryTool('prtg_get_object_sensor_summary', { id: '10' })
    );

    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe('/api/v2/sensor-status-summary/10');
    expect(result.isError).toBeUndefined();
  });

  it('returns a credential error without calling fetch when no key/baseUrl is configured', async () => {
    const result = await handleSummaryTool('prtg_get_sensor_status_summary', {});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/PRTG_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
