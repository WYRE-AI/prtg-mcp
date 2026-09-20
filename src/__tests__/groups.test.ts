import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleGroupTool } from '../tools/groups.js';
import { runWithCredentials } from '../client.js';
import { jsonResponse, textOf } from './test-helpers.js';

describe('handleGroupTool', () => {
  const fetchMock = vi.fn();
  const creds = { apiKey: 'key-1', baseUrl: 'https://prtg.example.com' };

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prtg_list_groups forwards pagination params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ objid: 10, name: 'Servers' }]));

    const result = await runWithCredentials(creds, () =>
      handleGroupTool('prtg_list_groups', { offset: 20, limit: 50, sort_by: '-name' })
    );

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api/v2/groups');
    expect(url.searchParams.get('offset')).toBe('20');
    expect(url.searchParams.get('limit')).toBe('50');
    expect(url.searchParams.get('sort_by')).toBe('-name');
    expect(result.isError).toBeUndefined();
  });

  it('prtg_get_group scopes the request to the group ID and forwards include', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ objid: 10, name: 'Servers' }));

    const result = await runWithCredentials(creds, () =>
      handleGroupTool('prtg_get_group', { id: '10', include: 'all_sections' })
    );

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api/v2/groups/10');
    expect(url.searchParams.get('include')).toBe('all_sections');
    expect(result.isError).toBeUndefined();
  });

  it('returns a credential error without calling fetch when no key/baseUrl is configured', async () => {
    const result = await handleGroupTool('prtg_list_groups', {});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/PRTG_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
