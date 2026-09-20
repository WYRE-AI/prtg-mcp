/**
 * PRTG authenticates with a static Bearer API key, generated in the PRTG
 * web UI (Account Settings -> My Account -> API Keys). Unlike most
 * connectors in this fleet, PRTG has no fixed hosted API endpoint - every
 * PRTG instance (on-premises PRTG Network Monitor, or a customer's own
 * PRTG Hosted Monitor tenant) is self-hosted at its own base URL, so a
 * base URL is a required part of the credential, not an optional
 * self-hosted override. See README's Authentication section.
 */
export interface PrtgCredentials {
  apiKey: string;
  baseUrl: string;
}

/** Thrown when PRTG rejects the API key (HTTP 401/403) - distinct from rate limiting so callers get an honest error. */
export class PrtgAuthError extends Error {}

/** Thrown when PRTG rate-limits the request (HTTP 429) - distinct from an auth failure. */
export class PrtgRateLimitError extends Error {}

/** Thrown for any other non-2xx / unexpected vendor response. */
export class PrtgApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** Shared offset/limit/filter/sort_by pagination params, present on every PRTG API v2 list endpoint. */
export interface ListParams {
  offset?: number;
  limit?: number;
  filter?: string;
  sort_by?: string;
}

/** Shared `id` (path) + `include` (csv of additional settings sections) params on every PRTG API v2 single-object GET endpoint. */
export interface GetObjectParams {
  id: string;
  include?: string;
}

export interface ListDevicesParams extends ListParams {
  sensor_status_summary?: boolean;
}

export interface ListAlarmsParams extends ListParams {
  include_all_channels?: boolean;
}

export interface GetSensorDataParams extends ListParams {
  id: string;
}

/**
 * PRTG API v2 list/object response bodies are passed through as received -
 * this connector doesn't re-model PRTG's full field set, only what a
 * caller needs to page and chain calls. See each tool's own JSDoc.
 */
export type PrtgResponse = unknown;
