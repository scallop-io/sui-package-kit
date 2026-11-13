# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-11-13

### Changed
- BREAKING: Upgrade to @mysten/sui 2.x and @scallop-io/sui-kit 3.x; both are now peer dependencies, and @mysten/bcs is no longer a dependency ([f207c0e](https://github.com/scallop-io/sui-package-kit/commit/f207c0e279bbd0c28d7e19354a735080f0f7dc22))
- BREAKING: Require Node >=22.12, since @mysten/sui 2.x is ESM-only ([f207c0e](https://github.com/scallop-io/sui-package-kit/commit/f207c0e279bbd0c28d7e19354a735080f0f7dc22))
- BREAKING: Publish and upgrade functions take a `ClientWithCoreApi` (such as `suiKit.client`) instead of `SuiClient` ([f207c0e](https://github.com/scallop-io/sui-package-kit/commit/f207c0e279bbd0c28d7e19354a735080f0f7dc22))
- BREAKING: `publishTxn` and `upgradeTxn` in results are now core API transaction objects; check `status.success` instead of `effects.status.status` ([f207c0e](https://github.com/scallop-io/sui-package-kit/commit/f207c0e279bbd0c28d7e19354a735080f0f7dc22))

### Fixed
- ESM build failed to load because of an extensionless `colorts` import ([f207c0e](https://github.com/scallop-io/sui-package-kit/commit/f207c0e279bbd0c28d7e19354a735080f0f7dc22))
