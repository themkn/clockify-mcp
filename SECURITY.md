# Security Policy

## Reporting a vulnerability

Please report security issues privately through GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository: open the **Security** tab and click **Report a vulnerability**.
Do not open a public GitHub issue for suspected vulnerabilities.

We aim to respond within 72 hours and to publish a fix for confirmed issues
within 14 days.

## Scope

This server handles a Clockify personal API key with full account access.
Issues of particular interest:
- Leaks of the API key in logs, errors, or tool responses
- Bypasses of the config-file permission check
- Any code path that calls out to a destination other than `api.clockify.me`
- Input-validation bypasses in tool handlers
