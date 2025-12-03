# Change Log

All notable changes to the "env-type" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.0.7] – 2025-02-XX

### Changed

* Removed the **`productIconThemes`** contribution block to ensure the extension is not treated as a theme or icon provider.
* The extension now operates exclusively as a **syntax highlighter** for files using the `.env.type` family of extensions.
* Updated the contribution manifest to strictly declare language and grammar definitions only.

### Fixed

* Corrected unintended behavior where the extension was being classified as a theme due to the previous configuration.

### Added

* None.