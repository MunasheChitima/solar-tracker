# Changelog

All notable changes to the SolarGainESP32 project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-21

### Changed
- **BREAKING**: Migrated from Twilio to WhatsApp Business API for direct integration
- Updated WhatsAppClient to use Meta's Graph API instead of Twilio
- Changed configuration structure to use WhatsApp Business API credentials
- Updated documentation to reflect new setup process

### Improved
- More direct WhatsApp integration without third-party service
- Better message delivery reliability
- Support for richer message formatting options

### Migration Guide
To migrate from v1.0.0 (Twilio) to v2.0.0 (WhatsApp Business API):
1. Create a Facebook Developer account and app
2. Add WhatsApp product to your app
3. Get your Phone Number ID and Access Token
4. Update config.json with new credentials structure
5. Re-upload configuration to ESP32

## [1.0.0] - 2024-12-21

### Added
- Initial release of SolarGainESP32
- Solar irradiance calculation engine using clear-sky model
- Hour-by-hour visualization on 2.4" TFT display (ST7789)
- WhatsApp notifications via Twilio API
- NTP time synchronization with timezone support
- Deep sleep mode for power efficiency (30-minute cycles)
- Secure credential storage using ESP32 Preferences
- Configuration via JSON file
- Support for tilted solar panels
- Ground reflection (albedo) calculations
- Atmospheric extinction based on elevation
- Unit tests for solar calculations and WhatsApp client
- GitHub Actions CI/CD pipeline
- Comprehensive documentation

### Configuration
- Default location: 32 George Road, Hatfield, Harare, Zimbabwe
- Default panel: 30° tilt, 180° azimuth (south-facing)
- Default notification time: 07:00 local time

### Technical Details
- Platform: ESP32 (tested on ESP32-DevKitC)
- Framework: Arduino
- Build system: PlatformIO
- Display driver: TFT_eSPI
- Time library: NTPClient + TimeLib
- JSON parsing: ArduinoJson v6
- HTTP client: ESP32 HTTPClient with SSL

## [Unreleased]

### Planned Features
- Weather API integration for cloud cover adjustments
- Historical data logging to SD card
- Web interface for configuration
- Multiple panel array support
- Battery monitoring for solar systems
- Telegram and email notification options
- Multi-language support
- Sunrise/sunset alerts
- Peak sun hours calculation
- ROI calculator based on electricity rates
