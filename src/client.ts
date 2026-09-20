import { AsyncLocalStorage } from 'node:async_hooks';
import { logger } from './utils/logger.js';
import { PrtgApiError, PrtgAuthError, PrtgRateLimitError } from './types.js';
import type {
  GetObjectParams,
  GetSensorDataParams,
  ListAlarmsParams,
  ListDevicesParams,
  ListParams,
  PrtgCredentials,
  PrtgResponse,
} from './types.js';

// Request-scoped credential store. In gateway mode the HTTP layer runs each
// request inside runWithCredentials({apiKey, baseUrl}); getCredentials()
// reads from it. Falls back to process.env for stdio/single-tenant mode.
const credStore = new AsyncLocalStorage<PrtgCredentials>();

export function runWithCredentials<T>(creds: PrtgCredentials, fn: () => T): T {
  return credStore.run(creds, fn);
}

export function getCredentials(): PrtgCredentials | null {
  const scoped = credStore.getStore();
  if (scoped?.apiKey && scoped?.baseUrl) return scoped;
  const apiKey = process.env.PRTG_API_KEY;
  const baseUrl = process.env.PRTG_BASE_URL;
  if (!apiKey || !baseUrl) {
    logger.warn('Missing credentials', { hasApiKey: !!apiKey, hasBaseUrl: !!baseUrl });
    return null;
  }
  return { apiKey, baseUrl };
}

function buildQuery(params: Record<string, unknown> = {}): URLSearchParams {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    qs.append(key, String(value));
  }
  return qs;
}

async function doGet(
  creds: PrtgCredentials,
  path: string,
  query?: Record<string, unknown>
): Promise<PrtgResponse> {
  const base = creds.baseUrl.replace(/\/+$/, '');
  const qs = query ? buildQuery(query).toString() : '';
  const url = `${base}/api/v2${path}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${creds.apiKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  // 401 (invalid/revoked API key) and 429 (rate-limited) are distinct
  // failure modes with distinct remediations - grouping them under one
  // generic auth-error class hides a transient rate limit behind a message
  // that reads like a bad/expired key. PRTG's own docs describe 401 for an
  // invalid/expired token and 403 for a token whose user lacks permission
  // to read the requested object - both surface as PrtgAuthError since
  // both mean "this key can't do that", not "try again".
  if (res.status === 401 || res.status === 403) {
    throw new PrtgAuthError(`PRTG rejected the request (HTTP ${res.status}): ${path}`);
  }
  if (res.status === 429) {
    throw new PrtgRateLimitError(`PRTG rate-limited the request (HTTP 429): ${path}`);
  }
  if (!res.ok) {
    throw new PrtgApiError(`PRTG ${path} failed: HTTP ${res.status}`, res.status);
  }
  // 204 (e.g. /health) has no body; every endpoint this connector implements
  // returns 200 with a JSON body, but guard defensively rather than throw
  // on an empty response.
  if (res.status === 204) return null;
  return res.json();
}

// ---------------------------------------------------------------------
// System
// ---------------------------------------------------------------------

/** GET /version - PRTG version and appserver version. Cheapest authenticated read; useful as a credential sanity check. */
export async function getVersion(creds: PrtgCredentials): Promise<PrtgResponse> {
  return doGet(creds, '/version');
}

// ---------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------

/** GET /devices - list devices (hostname/IP, status, parent group/probe). */
export async function listDevices(creds: PrtgCredentials, params: ListDevicesParams = {}): Promise<PrtgResponse> {
  return doGet(creds, '/devices', { ...params });
}

/** GET /devices/{id} - metrics and settings of a single device. */
export async function getDevice(creds: PrtgCredentials, { id, include }: GetObjectParams): Promise<PrtgResponse> {
  return doGet(creds, `/devices/${encodeURIComponent(id)}`, { include });
}

// ---------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------

/** GET /groups - list groups (the organizational folders that contain devices). */
export async function listGroups(creds: PrtgCredentials, params: ListParams = {}): Promise<PrtgResponse> {
  return doGet(creds, '/groups', { ...params });
}

/** GET /groups/{id} - metrics and settings of a single group. */
export async function getGroup(creds: PrtgCredentials, { id, include }: GetObjectParams): Promise<PrtgResponse> {
  return doGet(creds, `/groups/${encodeURIComponent(id)}`, { include });
}

// ---------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------

/** GET /probes - list probes (the monitoring agents - local, remote, or mini - that run the actual checks). */
export async function listProbes(creds: PrtgCredentials, params: ListParams = {}): Promise<PrtgResponse> {
  return doGet(creds, '/probes', { ...params });
}

/** GET /probes/{id} - metrics and settings of a single probe. */
export async function getProbe(creds: PrtgCredentials, { id, include }: GetObjectParams): Promise<PrtgResponse> {
  return doGet(creds, `/probes/${encodeURIComponent(id)}`, { include });
}

/** GET /probes/{id}/info - network information (e.g. the probe host's own connectivity details) for a probe. */
export async function getProbeNetworkInfo(creds: PrtgCredentials, id: string): Promise<PrtgResponse> {
  return doGet(creds, `/probes/${encodeURIComponent(id)}/info`);
}

// ---------------------------------------------------------------------
// Sensors
// ---------------------------------------------------------------------

/** GET /sensors - list sensors (the individual checks - ping, HTTP, SNMP, etc. - attached to a device). */
export async function listSensors(creds: PrtgCredentials, params: ListParams = {}): Promise<PrtgResponse> {
  return doGet(creds, '/sensors', { ...params });
}

/** GET /sensors/{id} - metrics and settings of a single sensor. */
export async function getSensor(creds: PrtgCredentials, { id, include }: GetObjectParams): Promise<PrtgResponse> {
  return doGet(creds, `/sensors/${encodeURIComponent(id)}`, { include });
}

/** GET /sensors/{id}/data - channel measurement history for a sensor. The actual monitoring/performance data. */
export async function getSensorData(creds: PrtgCredentials, { id, ...params }: GetSensorDataParams): Promise<PrtgResponse> {
  return doGet(creds, `/sensors/${encodeURIComponent(id)}/data`, { ...params });
}

/** GET /sensors/alarms - sensors currently in a Down/Warning/etc. alarm state that match a filter. PRTG's alerting surface. */
export async function listAlarms(creds: PrtgCredentials, params: ListAlarmsParams = {}): Promise<PrtgResponse> {
  return doGet(creds, '/sensors/alarms', { ...params });
}

// ---------------------------------------------------------------------
// Sensor status summary
// ---------------------------------------------------------------------

/** GET /sensor-status-summary - a summary of all sensor states across the whole PRTG instance. */
export async function getSensorStatusSummary(creds: PrtgCredentials): Promise<PrtgResponse> {
  return doGet(creds, '/sensor-status-summary');
}

/** GET /sensor-status-summary/{id} - a summary of sensor states scoped to one probe, group, or device. */
export async function getObjectSensorSummary(creds: PrtgCredentials, id: string): Promise<PrtgResponse> {
  return doGet(creds, `/sensor-status-summary/${encodeURIComponent(id)}`);
}

// ---------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------

/** GET /channels/{id} - the metrics and settings (units, limits, current value) of a single channel on a sensor. */
export async function getChannel(creds: PrtgCredentials, { id, include }: GetObjectParams): Promise<PrtgResponse> {
  return doGet(creds, `/channels/${encodeURIComponent(id)}`, { include });
}
