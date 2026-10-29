# Security

flint ships source that you copy into your application; it has no server component and no runtime
service. The attack surface is the CLI and the registry files it downloads.

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | yes, latest patch |
| older | no |

## Reporting

Do not open a public issue for a vulnerability. Use GitHub's private vulnerability reporting on
`wshrx/flint-ui` (Security → Report a vulnerability), or open a private security advisory.

Include the version (`flint-ui --version`), the platform, the registry URL, and the smallest file
that reproduces it. If the problem is a malicious registry, include its URL; the CLI validates
structure, not intent.

## What counts

- the CLI writing outside the configured root, or following `..` in a registry path;
- a registry file that executes code during `init` or `add`;
- the installer fetching over plain HTTP or from a host other than GitHub;
- a checksum mismatch between a release asset and `SHA256SUMS`.
