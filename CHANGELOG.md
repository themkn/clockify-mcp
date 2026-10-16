# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-10-16

### Added
- Automated npm publishing and GitHub release creation on `v*` tags via GitHub Actions with npm trusted publishing (OIDC), no stored npm token

### Changed
- Bump `@modelcontextprotocol/sdk` from 1.29.0 to 1.32.1 (#53)
- Refresh transitive dependencies via `npm audit fix` (hono, @hono/node-server, fast-uri, ip-address, qs, proxy-addr, body-parser, source-map-js) (#53, #36, #26, #22)
- `prepublishOnly` now builds `dist/` so a publish can never ship without compiled output

### Fixed
- MCP `serverInfo.version` is now read from `package.json` instead of a hardcoded string that had drifted to 1.0.1

### Security
- `@modelcontextprotocol/sdk` < 1.31.0: OAuth client could send credentials to an authorization server chosen by the MCP server (high)
- `fast-uri` < 3.1.6: host confusion and SSRF via malformed IPv6, percent-encoded scheme and backslash authority handling (high)
- `ip-address` < 10.7.1: SSRF and trust-boundary bypass via leading-zero octets, NAT64 and link-local misclassification (high/medium)
- `proxy-addr` < 2.0.8: IP spoofing via IPv4-mapped IPv6 trust subnet (critical)
- `source-map-js` < 1.2.2: event-loop denial of service via indexed source-map section offsets (high)
- `qs` < 6.16.0: array-limit bypass and denial of service via attacker-controlled isBuffer (medium)
- `hono` < 4.13.7: multiple medium advisories (XSS in jsx boundary components, parseBody memory exhaustion, query parser fragment handling, CORS ReDoS, memo SSR leak)

## [1.0.2]

Initial tagged release baseline (no changelog kept before this file).

[1.0.3]: https://github.com/themkn/clockify-mcp/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/themkn/clockify-mcp/releases/tag/v1.0.2
