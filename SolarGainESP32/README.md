# SolarGainESP32 - Solar Irradiance Forecast & WhatsApp Alerts

An autonomous ESP32-based solar irradiance forecasting system that calculates hourly solar energy potential and sends daily WhatsApp notifications using the WhatsApp Business API. Designed specifically for Harare, Zimbabwe but easily configurable for any location.

![Build Status](https://github.com/yourusername/SolarGainESP32/workflows/Build%20&%20Test%20SolarGainESP32/badge.svg)

## Features

- 🌞 **Real-time Solar Calculations**: Calculates hourly solar irradiance (kWh/m²) based on location, panel orientation, and atmospheric conditions
- 📊 **Visual Display**: Shows hour-by-hour solar potential on a 2.4" TFT display with colored bars
- 📱 **WhatsApp Notifications**: Sends daily forecasts via WhatsApp Business API at a scheduled time (default: 07:00)
- ⏰ **NTP Time Sync**: Automatically syncs time via WiFi and handles timezone conversion
- 💤 **Power Efficient**: Deep sleep between updates to conserve power
- 🔒 **Secure Configuration**: Stores credentials securely in ESP32's non-volatile storage
- 🔄 **OTA Updates**: Support for over-the-air firmware updates (optional)

## Hardware Requirements

- ESP32 Development Board (tested with ESP32-DevKitC)
- 2.4" TFT Display (ST7789 driver, SPI interface)
- USB cable for programming
- Stable WiFi connection

### Pin Connections

| TFT Pin | ESP32 Pin | Description |
|---------|-----------|-------------|
| VCC     | 3.3V      | Power       |
| GND     | GND       | Ground      |
| CS      | GPIO 5    | Chip Select |
| RESET   | GPIO 17   | Reset       |
| DC      | GPIO 16   | Data/Command|
| MOSI    | GPIO 23   | SPI Data    |
| SCLK    | GPIO 18   | SPI Clock   |
| LED     | GPIO 4    | Backlight   |
| MISO    | GPIO 19   | (Optional)  |

## Software Setup

### Prerequisites

1. **PlatformIO**: Install [PlatformIO IDE](https://platformio.org/install) or PlatformIO Core
2. **WhatsApp Business Account**: Set up [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
3. **Git**: For cloning the repository

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/SolarGainESP32.git
cd SolarGainESP32
```

2. Configure your settings by editing `data/config.json`:
```json
{
  "wifi": {
    "ssid": "YOUR_WIFI_SSID",
    "password": "YOUR_WIFI_PASSWORD"
  },
  "whatsapp": {
    "phone_number_id": "YOUR_PHONE_NUMBER_ID",
    "access_token": "YOUR_ACCESS_TOKEN",
    "recipient_number": "+263XXXXXXXXX"
  },
  "location": {
    "name": "32 George Road, Hatfield, Harare",
    "latitude": -17.7831,
    "longitude": 31.0909,
    "elevation": 650,
    "timezone_offset": 2
  },
  "panel": {
    "tilt": 30,
    "azimuth": 180
  },
  "notifications": {
    "enabled": true,
    "hour": 7,
    "minute": 0
  },
  "sleep": {
    "duration_minutes": 30
  }
}
```

3. Build and upload the firmware:
```bash
# Build the project
pio run

# Upload firmware
pio run --target upload

# Upload SPIFFS data (config.json)
pio run --target uploadfs

# Monitor serial output
pio device monitor
```

## Configuration Guide

### Location Settings

- **latitude/longitude**: Your exact coordinates (decimal degrees)
- **elevation**: Height above sea level in meters
- **timezone_offset**: Hours from UTC (Harare is UTC+2)

### Panel Settings

- **tilt**: Panel tilt angle from horizontal (0-90°)
  - Optimal for Harare: ~30° (latitude + 10-15°)
- **azimuth**: Panel direction (0° = North, 180° = South)
  - Southern hemisphere: Face north (0°) or optimize for specific needs

### WhatsApp Business API Setup

1. **Create Facebook Business Account**:
   - Go to [Facebook Business](https://business.facebook.com)
   - Create a new business account or use existing

2. **Set up WhatsApp Business API**:
   - Navigate to [Facebook Developers](https://developers.facebook.com)
   - Create a new app or use existing
   - Add WhatsApp product to your app
   - Generate a permanent access token
   - Note your Phone Number ID from the API Setup

3. **Configure in config.json**:
   - `phone_number_id`: Your WhatsApp Business phone number ID
   - `access_token`: Your permanent access token (starts with "EAA...")
   - `recipient_number`: Target phone number in international format (e.g., +263771234567)

### Notification Settings

- **enabled**: Turn WhatsApp notifications on/off
- **hour/minute**: Time to send daily forecast (24-hour format, local time)

## Display Interface

The TFT display shows:
- Header: "Solar Forecast" with current date
- Hourly bars: Visual representation of irradiance (0-24 hours)
  - 🔴 Red: >0.8 kWh/m²
  - 🟠 Orange: 0.6-0.8 kWh/m²
  - 🟡 Yellow: 0.4-0.6 kWh/m²
  - 🟢 Green: 0.2-0.4 kWh/m²
  - ⬜ Gray: <0.2 kWh/m²
- Footer: Daily total in kWh/m²
- Status bar: Current time, WiFi status, next update countdown

## WhatsApp Message Format

```
🌞 Solar Gain Forecast
📍 32 George Road, Hatfield, Harare
📅 2024-06-21

⚡ Daily Total: 5.67 kWh/m²

📊 Hourly Breakdown:
06:00 → ▪ 0.15 kWh/m²
07:00 → ▪▪ 0.32 kWh/m²
08:00 → ▪▪▪ 0.48 kWh/m²
...
18:00 → ▪ 0.12 kWh/m²

🌅 Sunrise: 06:00
🌇 Sunset: 18:00
```

## Solar Calculation Model

The system uses a clear-sky radiation model with:
- Solar position algorithm (SPA) for accurate sun tracking
- Atmospheric extinction coefficient based on elevation
- Direct Normal Irradiance (DNI) and Diffuse Horizontal Irradiance (DHI)
- Panel orientation adjustments for tilted surfaces
- Ground reflection (albedo = 0.2)

## Power Management

- Deep sleep for 30 minutes between updates
- Display backlight control
- WiFi disconnect during sleep
- Typical power consumption:
  - Active: ~150mA @ 3.3V
  - Deep sleep: ~10µA @ 3.3V

## Troubleshooting

### WiFi Connection Issues
- Check SSID and password in config.json
- Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
- Verify router allows new device connections

### Display Not Working
- Check wiring connections
- Verify TFT_eSPI pin definitions in platformio.ini
- Test with simple TFT examples first

### WhatsApp Messages Not Sending
- Verify WhatsApp Business API credentials
- Check access token is valid and not expired
- Ensure phone number ID is correct
- Verify recipient number format (+countrycode...)
- Check serial monitor for error messages
- Test API connection using Facebook's Graph API Explorer

### Time Sync Issues
- Ensure internet connection is stable
- Try different NTP servers by modifying TimeSync.cpp
- Check timezone offset is correct

## Development

### Project Structure
```
SolarGainESP32/
├── src/
│   └── main.cpp           # Main firmware logic
├── lib/
│   ├── SolarCalc/         # Solar calculations
│   ├── TimeSync/          # NTP time synchronization
│   ├── Display/           # TFT display interface
│   ├── WhatsAppClient/    # WhatsApp Business API integration
│   └── ConfigManager/     # Configuration management
├── test/
│   ├── test_solar_calc.cpp    # Solar calculation tests
│   └── test_whatsapp_client.cpp # WhatsApp client tests
├── data/
│   └── config.json        # Configuration file
├── platformio.ini         # PlatformIO configuration
└── .github/
    └── workflows/
        └── build.yml      # CI/CD pipeline
```

### Running Tests
```bash
# Run all tests
pio test

# Run specific test
pio test -f test_solar_calc

# Run tests with verbose output
pio test -v
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Solar position algorithms based on NREL's Solar Position Algorithm
- TFT_eSPI library by Bodmer
- PlatformIO community for excellent tooling
- Meta/Facebook for WhatsApp Business API

## Support

For issues, questions, or contributions, please:
- Open an issue on GitHub
- Check existing issues for solutions
- Read the troubleshooting guide above

---

Made with ☀️ in Harare, Zimbabwe