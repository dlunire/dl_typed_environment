# Change Log

All notable changes to the `env-type` extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this document.

---

## [Unreleased]

---

## [0.0.8] – 2025-12-04

### Added

* Implemented **IntelliSense autocompletion** for variable types defined in `env.type`.
* `Types` interface and `description` dictionary integrated to provide tooltip documentation for supported types.
* Initial `CompletionItemProvider` established for future language expansion (parser, validation, formatting).

### Changed

* Moved towards a language-tooling oriented architecture, preparing the ground for parser refactor and extended DSL.
* Internal structure reorganized to allow future `rust-analyzer style` evolutions.

### Fixed

* None.

---

## [0.0.7] – 2025-02-XX

### Changed

* Removed the `productIconThemes` contribution block to ensure the extension is not treated as a theme or icon provider.
* The extension now operates exclusively as a syntax highlighter for `.env.type` files.
* Updated the contribution manifest to strictly declare language and grammar definitions only.

### Fixed

* Corrected unintended behavior where the extension was being classified as a theme due to previous configuration.

### Added

* None.