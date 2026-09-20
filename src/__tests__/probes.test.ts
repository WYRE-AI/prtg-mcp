import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleProbeTool } from '../tools/probes.js';
import { runWithCredentials } from '../client.js';
import { jsonResponse, textOf } from './test-helpers.js';

describe('handleProbeTool', () => {
  const fetchMock = vi.fn();
  const creds = { apiKey: 'key-1', baseUrl: 'https://prtg.example.com' };

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prtg_list_probes sends the Bearer token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ objid: 1, name: 'Local Probe' }]));

    const result = await runWithCredentials(creds, () => handleProbeTool('prtg_list_probes', {}));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe('/api/v2/probes');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer key-1');
    expect(result.isError).toBeUndefined();
  });

  it('prtg_get_probe scopes the request to the probe ID', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ objid: 1, name: 'Local Probe' }));

    const result = await runWithCredentials(creds, () => handleProbeTool('prtg_get_probe', { id: '1' }));

    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe('/api/v2/probes/1');
    expect(result.isError).toBeUndefined();
  });

  it('prtg_get_probe_network_info requests the /info sub-resource', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ip: '10.0.0.1' }));

    const result = await runWithCredentials(creds, () =>
      handleProbeTool('prtg_get_probe_network_info', { id: '1' })
    );

    expect(new URL(fetchMock.mock.calls[0][0] as string).pathname).toBe('/api/v2/probes/1/info');
    expect(result.isError).toBeUndefined();
  });

  it('returns a credential error without calling fetch when no key/baseUrl is configured', async () => {
    const result = await handleProbeTool('prtg_list_probes', {});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/PRTG_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
