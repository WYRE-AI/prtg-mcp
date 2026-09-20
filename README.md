# PRTG MCP Server

MCP server for [Paessler PRTG](https://www.paessler.com/prtg)'s REST API v2 - device/sensor status, monitoring data (channel measurement history), and alerts (sensors in an alarm state) across a PRTG network/infrastructure monitoring instance - for AI assistants and the WYRE Conduit gateway.

## Authentication

PRTG authenticates with a static **Bearer API key**, generated in the PRTG web UI under **Account Settings -> My Account -> API Keys**. No admin approval is required to generate one - any PRTG user can create a key for themselves. Unlike most connectors in this fleet, PRTG has no fixed hosted API endpoint: every PRTG instance (on-premises PRTG Network Monitor, or a customer's own PRTG Hosted Monitor tenant) is self-hosted at its own base URL, so this connector requires **both** an API key and a base URL. The key is sent as `Authorization: Bearer <key>` to `<base URL>/api/v2/...`. In gateway mode both arrive per-request via the `X-PRTG-Api-Key` and `X-PRTG-Base-URL` headers; in local/stdio mode they're read once from `PRTG_API_KEY` and `PRTG_BASE_URL`.

### Credential scope

**Vendor-documented, not independently verified against a live account** (see Verification below for why): per Paessler's own PRTG API v2 documentation, an API key inherits the full permissions of the PRTG user account that created it - keys cannot be independently scoped to read-only. Paessler's own guidance for AI-assistant integrations is explicit: *"grant [API keys used in AI assistants] the lowest user role that fits the assistant's task,"* and recommends creating a **dedicated read-only PRTG user account** first, then generating the API key under that account, rather than relying on the key itself to restrict access. This connector cannot enforce that on PRTG's side - it only implements the read-only tool surface described below - so the actual read-only guarantee depends on the customer following Paessler's own recommendation when they generate the key.

### Verification

This connector was built directly against PRTG's official, current OpenAPI v2 specification (`prtg.api.yaml`, published at `paessler.com/support/prtg/api/v2/oas/`), not against secondary documentation or a naming convention - every tool below maps to one real, named operation in that spec, with its exact query parameters. What it is **not** is independently verified against a live PRTG instance: PRTG's free tiers are (a) a 30-day trial of **PRTG Network Monitor**, which is Windows-only on-premises software, and (b) a 10-day trial of **PRTG Hosted Monitor** (`app.my-prtg.com/signup`), a cloud SaaS signup whose verification flow could not be completed in this build environment (no Windows host to install PRTG Network Monitor on; no email inbox available to complete PRTG Hosted Monitor's signup confirmation). Both are genuinely self-serve for a human with a Windows machine or an email inbox to check - this is an environment limitation of the build, not a vendor-side approval gate.

## Configuration

| Env var | Description |
|---|---|
| `PRTG_API_KEY` | Bearer API key issued by the PRTG web UI. |
| `PRTG_BASE_URL` | Base URL of the PRTG core server, e.g. `https://prtg.example.com`. |
| `MCP_TRANSPORT` | `stdio` (default) or `http`. |
| `AUTH_MODE` | `env` (default, reads the vars above) or `gateway` (credentials arrive per-request via the `X-PRTG-Api-Key` / `X-PRTG-Base-URL` headers, injected by the Conduit gateway). |
| `CONDUIT_S2S_SECRET` | When set, the HTTP transport requires a valid `X-Gateway-S2S` header (Conduit sidecar auth) on every `/mcp` request. |
| `LOG_LEVEL` | `debug` \| `info` (default) \| `warn` \| `error`. |

## Tools

### Devices
- `prtg_list_devices` - list monitored devices (hostname/IP, status, parent group/probe).
- `prtg_get_device` - get the metrics and settings of a single device.

### Groups
- `prtg_list_groups` - list groups (the organizational folders that contain devices).
- `prtg_get_group` - get the metrics and settings of a single group.

### Probes
- `prtg_list_probes` - list probes (the monitoring agents - local, remote, or mini - that run the actual sensor checks).
- `prtg_get_probe` - get the metrics and settings of a single probe.
- `prtg_get_probe_network_info` - get network information for a probe.

### Sensors
- `prtg_list_sensors` - list sensors (the individual checks - ping, HTTP, SNMP, etc. - attached to a device), with their current status.
- `prtg_get_sensor` - get the metrics and settings of a single sensor.
- `prtg_get_sensor_data` - get channel measurement history (the actual monitoring/performance data) for a sensor.
- `prtg_list_alarms` - list sensors currently in a Down/Warning/Unusual/etc. alarm state. PRTG's alerting surface.

### Sensor status summary
- `prtg_get_sensor_status_summary` - get a summary of all sensor states across the whole instance.
- `prtg_get_object_sensor_summary` - get a sensor-state summary scoped to one probe, group, or device.

### Channels
- `prtg_get_channel` - get the metrics and settings (units, limits, current value) of a single channel on a sensor.

### System
- `prtg_get_version` - get the PRTG core/appserver version. Useful as a credential/connectivity sanity check.

## Scope

**This is a deliberately narrow, read-only v1 surface covering exactly device/sensor status, monitoring data, and alerts - nothing else.** PRTG API v2 documents a large surface (object CRUD, autodiscovery, user/API-key administration, AI-assistant endpoints, an entire `/experimental` namespace); this connector implements 15 `GET` operations from it (10 stable, non-experimental, and 5 documented-but-deprecated - see below), verified one-by-one against the official OpenAPI spec, and excludes every write/pause/resume/scan/acknowledge/discovery/administration operation, plus every genuinely `/experimental/*` endpoint, by design, not by oversight.

A few of the 15 implemented endpoints (`GET /devices`, `/groups`, `/probes`, `/sensors`, `/sensors/alarms`) are marked `deprecated` in PRTG's own v2 spec, in favor of an `/experimental/*` replacement. This connector deliberately uses the documented, currently-working deprecated endpoint rather than its `/experimental` replacement: PRTG's own spec states experimental endpoints "might change," while a deprecated endpoint "still works" and is the only non-experimental way to list PRTG's core object types at all. A stable-but-deprecated endpoint was judged the safer choice for a production connector over an unstable-but-current one; every `/experimental/*` endpoint (list or otherwise) is excluded outright below.

**Hard-excluded (mutation - pause/resume/scan) - never implemented:** `POST /devices/{id}/pause`, `/devices/{id}/resume`, `/devices/{id}/scan`, `/devices/pause`, `/devices/resume`, `/devices/scan`, `/groups/{id}/pause`, `/groups/{id}/resume`, `/groups/{id}/scan`, `/groups/pause`, `/groups/resume`, `/groups/scan`, `/probes/{id}/pause`, `/probes/{id}/resume`, `/probes/{id}/scan`, `/probes/pause`, `/probes/resume`, `/probes/scan`, `/sensors/{id}/pause`, `/sensors/{id}/resume`, `/sensors/{id}/scan`, `/sensors/pause`, `/sensors/resume`, `/sensors/scan`, `/users/{id}/pause`, `/users/{id}/resume`, `/users/pause`, `/users/resume`.

**Hard-excluded (acknowledge-alert) - never implemented:** `POST /sensors/{id}/acknowledge`, `/sensors/acknowledge` - acknowledging an alarm is a write action on PRTG's alerting state, excluded per this connector's hard scope boundary even though it reads like a status query.

**Hard-excluded (object mutation) - never implemented:** `POST /objects/{id}/move`, `/objects/{id}/clone`, and the entire `/experimental` namespace's create/update/delete operations (`PATCH /experimental/groups/{id}`, `/experimental/probes/{id}`, `/experimental/sensors/{id}`; `POST /experimental/groups/{id}/group`, `/experimental/probes/{id}/group`, `/experimental/groups/{id}/device`, `/experimental/probes/{id}/device`, `/experimental/devices/{id}/sensor`; `DELETE /experimental/devices/{id}`) and its experimental read-only list mirrors (`GET /experimental/devices`, `/experimental/groups`, `/experimental/probes`, `/experimental/sensors`, `/experimental/channels`, `/experimental/objects`, `/experimental/devices/templates`) - excluded as a whole namespace PRTG's own docs describe as subject to change, not individually vetted as safe.

**Hard-excluded (autodiscovery) - never implemented:** `GET /autodiscoveries`, `/experimental/autodiscoverytasks`, `/experimental/autodiscoverytasks/{id}`; `POST /experimental/devices/{id}/autodiscovery`, `/experimental/groups/{id}/autodiscovery`, `/experimental/devices/{id}/metascan`, `/experimental/probes/{id}/autodiscoverytask`, `/experimental/autodiscoverytasks/{id}/start` - autodiscovery inventories and triggers network scans; out of this connector's device/sensor/monitoring/alert scope.

**Hard-excluded (user/API-key/session/license administration - identity and credential management, not device/sensor/alert data) - never implemented:** `GET/POST/PATCH /users*`, `/experimental/users*`, `/usergroups*`, `/experimental/usergroups*`, `/users/api-keys/find`, `/users/{id}/api-keys`, `DELETE /users/api-keys/{id}`, `POST/GET/DELETE /session` (login/renew/logout), `POST /users/request-password`, `/users/reset-password`, `GET /experimental/license`.

**Hard-excluded (object schema/generic-CRUD/settings/AI-feature/misc administration) - out of scope, never implemented:** `GET/POST/PATCH /schemas/{kind}`, `/experimental/schemas/*`, `GET /experimental/objects`, `/objects`, `/objects/count`, `/libraries`, `/lookup-definitions*`, `/setting-lookups/{name}`, `/settings/public`, `/health` (unauthenticated liveness only - `prtg_get_version` is this connector's authenticated sanity check instead), `/devices/icons`, `/experimental/feature-toggles`, `/experimental/featureflags`, `/experimental/ai/analyze`, `/experimental/ai/status`, `/experimental/timeseries/{id}`, `/experimental/timeseries/{id}/{type}`, `/channels` (list) and `/channels/data` (both deprecated in favor of the implemented `GET /channels/{id}`, itself not deprecated), `/channels/{id}/overview`, `/devices/{id}/overview`, `/groups/{id}/overview`, `/probes/{id}/overview`, `/sensors/{id}/overview` (all deprecated in favor of the implemented non-overview `GET .../{id}` equivalents).

They can be added as a follow-up if there's demand, after a deliberate scope decision - not by default.

## Development

```bash
npm install
npm run build
npm test
npm run lint   # tsc --noEmit
```

## Docker

```bash
docker build -t prtg-mcp .
docker run -p 8080:8080 -e PRTG_API_KEY=... -e PRTG_BASE_URL=https://prtg.example.com prtg-mcp
```
