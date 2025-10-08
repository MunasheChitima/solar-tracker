# SolarGainESP32 Project Structure

```
SolarGainESP32/
│
├── 📁 .github/
│   └── 📁 workflows/
│       └── 📄 build.yml              # CI/CD pipeline for automated builds
│
├── 📁 data/
│   ├── 📄 config.json               # Main configuration file (user edits this)
│   └── 📄 config.template.json      # Template configuration for reference
│
├── 📁 lib/                          # Custom libraries
│   ├── 📁 ConfigManager/
│   │   ├── 📄 ConfigManager.h       # Configuration management header
│   │   └── 📄 ConfigManager.cpp     # Secure credential storage implementation
│   │
│   ├── 📁 Display/
│   │   ├── 📄 Display.h             # TFT display interface header
│   │   └── 📄 Display.cpp           # Display rendering and UI implementation
│   │
│   ├── 📁 SolarCalc/
│   │   ├── 📄 SolarCalc.h           # Solar calculation algorithms header
│   │   └── 📄 SolarCalc.cpp         # Solar position and irradiance calculations
│   │
│   ├── 📁 TimeSync/
│   │   ├── 📄 TimeSync.h            # NTP time synchronization header
│   │   └── 📄 TimeSync.cpp          # Time sync and timezone handling
│   │
│   └── 📁 WhatsAppClient/
│       ├── 📄 WhatsAppClient.h      # WhatsApp/Twilio API header
│       └── 📄 WhatsAppClient.cpp    # WhatsApp messaging implementation
│
├── 📁 src/
│   └── 📄 main.cpp                  # Main firmware entry point
│
├── 📁 test/
│   ├── 📄 test_solar_calc.cpp       # Unit tests for solar calculations
│   └── 📄 test_whatsapp_client.cpp  # Unit tests for WhatsApp client
│
├── 📄 .gitignore                    # Git ignore patterns
├── 📄 CHANGELOG.md                  # Version history and changes
├── 📄 LICENSE                       # MIT License
├── 📄 QUICK_START.md               # Quick setup guide
├── 📄 README.md                    # Comprehensive documentation
├── 📄 library.json                 # PlatformIO library manifest
├── 📄 platformio.ini               # PlatformIO configuration
└── 📄 PROJECT_STRUCTURE.md         # This file

```

## Module Overview

### 🌞 SolarCalc
- Implements NREL-based solar position algorithms
- Calculates Direct Normal Irradiance (DNI) and Diffuse Horizontal Irradiance (DHI)
- Handles panel tilt and azimuth corrections
- Accounts for atmospheric extinction and ground reflection

### ⏰ TimeSync
- NTP client for accurate time synchronization
- Timezone handling (configured for Harare GMT+2)
- Schedule checking for notifications
- RTC integration for deep sleep persistence

### 📊 Display
- TFT_eSPI driver wrapper for ST7789 displays
- Hourly bar chart visualization
- Color-coded irradiance levels
- Status bar with WiFi and time info

### 📱 WhatsAppClient
- Twilio API integration
- HTTPS POST requests
- Message formatting with emojis
- Base64 authentication

### ⚙️ ConfigManager
- JSON configuration parsing
- Secure credential storage using Preferences
- Factory reset capability
- Configuration validation

### 🔌 Main Firmware
- WiFi connection management
- Deep sleep orchestration (30-minute cycles)
- Boot counter persistence
- Error handling and recovery

## Data Flow

1. **Boot** → Load config → Connect WiFi → Sync time
2. **Calculate** → Get date/time → Solar calculations → Update display
3. **Notify** → Check schedule → Format message → Send WhatsApp
4. **Sleep** → Save state → Deep sleep → Wake and repeat

## Memory Usage

- **Flash**: ~450KB (firmware + SPIFFS)
- **RAM**: ~40KB active, minimal in deep sleep
- **SPIFFS**: 1.5MB allocated for config and future data logging

## Power Profile

- **Active Mode**: 150mA @ 3.3V (WiFi + Display)
- **Deep Sleep**: 10µA @ 3.3V
- **Daily Average**: ~7.5mA (48 wake cycles/day)

## Build Artifacts

After building, you'll find:
- `.pio/build/esp32dev/firmware.bin` - Main firmware
- `.pio/build/esp32dev/spiffs.bin` - Filesystem image
- `.pio/build/esp32dev/firmware.elf` - Debug symbols
