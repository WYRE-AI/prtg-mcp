import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleSystemTool } from '../tools/system.js';
import { runWithCredentials } from '../client.js';
import { jsonResponse, textOf } from './test-helpers.js';

describe('handleSystemTool', () => {
  const fetchMock = vi.fn();
  const creds = { apiKey: 'key-1', baseUrl: 'https://prtg.example.com' };

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prtg_get_version sends the Bearer token and hits /version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ prtg_version: '25.1.1.1', app_version: '25.1.1.1' }));

    const result = await runWithCredentials(creds, () => handleSystemTool('prtg_get_version', {}));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe('/api/v2/version');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer key-1');
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(textOf(result)).prtg_version).toBe('25.1.1.1');
  });

  it('returns a credential error without calling fetch when no key/baseUrl is configured', async () => {
    const result = await handleSystemTool('prtg_get_version', {});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/PRTG_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
