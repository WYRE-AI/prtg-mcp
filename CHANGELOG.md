# Changelog

All notable changes to this project will be documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

Per-version release notes for tagged releases are published on the [GitHub Releases page](https://github.com/WYRE-AI/prtg-mcp/releases) - `semantic-release` generates them from commit history at release time.

## [Unreleased]

### Added

- Initial v1 release: 15 read-only tools covering device/sensor status, monitoring data (channel measurement history), and alerts (sensors in an alarm state) against Paessler PRTG's REST API v2 - devices, groups, probes, sensors, sensor-status summaries, channels, and a version/connectivity check. Bearer API key + per-instance base URL authentication (PRTG has no shared hosted endpoint; every instance is self-hosted). See README's Scope section for the full list of deliberately excluded write/pause/resume/scan/acknowledge/discovery/administration endpoints.
