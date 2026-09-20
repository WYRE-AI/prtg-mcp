import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleChannelTool } from '../tools/channels.js';
import { runWithCredentials } from '../client.js';
import { jsonResponse, textOf } from './test-helpers.js';

describe('handleChannelTool', () => {
  const fetchMock = vi.fn();
  const creds = { apiKey: 'key-1', baseUrl: 'https://prtg.example.com' };

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prtg_get_channel scopes the request to the channel ID and forwards include', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ objid: 1, name: 'Downtime' }));

    const result = await runWithCredentials(creds, () =>
      handleChannelTool('prtg_get_channel', { id: '1', include: 'path' })
    );

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api/v2/channels/1');
    expect(url.searchParams.get('include')).toBe('path');
    expect(result.isError).toBeUndefined();
  });

  it('returns a credential error without calling fetch when no key/baseUrl is configured', async () => {
    const result = await handleChannelTool('prtg_get_channel', { id: '1' });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/PRTG_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
