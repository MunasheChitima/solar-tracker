# Quick Start Guide - SolarGainESP32

Get your solar irradiance forecaster running in 15 minutes!

## What You Need

### Hardware
- ESP32 development board
- 2.4" SPI TFT display (ST7789)
- Jumper wires
- Micro USB cable

### Accounts
- WiFi network (2.4 GHz)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started) account

## Step 1: Wire the Display

Connect your TFT display to the ESP32:

```
TFT Display  →  ESP32
─────────────────────
VCC         →  3.3V
GND         →  GND
CS          →  GPIO 5
RESET       →  GPIO 17
DC          →  GPIO 16
MOSI        →  GPIO 23
SCLK        →  GPIO 18
LED         →  GPIO 4
```

## Step 2: Install Software

1. **Install PlatformIO**
   - Download [VS Code](https://code.visualstudio.com/)
   - Install PlatformIO extension from VS Code marketplace

2. **Clone the Project**
   ```bash
   git clone https://github.com/yourusername/SolarGainESP32.git
   cd SolarGainESP32
   ```

## Step 3: Configure Your Settings

1. **Copy the template**
   ```bash
   cp data/config.template.json data/config.json
   ```

2. **Edit `data/config.json`** with your details:
   ```json
   {
     "wifi": {
       "ssid": "YourWiFiName",
       "password": "YourWiFiPassword"
     },
     "whatsapp": {
       "phone_number_id": "Get from WhatsApp Business",
       "access_token": "Get from Facebook Developer Console",
       "recipient_number": "+yourphonenumber"
     },
     "location": {
       "latitude": -17.7831,
       "longitude": 31.0909
     }
   }
   ```

## Step 4: Set Up WhatsApp Business API (10 minutes)

1. **Create Facebook Developer Account**
   - Go to [developers.facebook.com](https://developers.facebook.com)
   - Sign up or log in with your Facebook account

2. **Create an App**
   - Click "My Apps" → "Create App"
   - Choose "Business" type
   - Fill in app details

3. **Add WhatsApp Product**
   - In your app dashboard, click "Add Product"
   - Find WhatsApp and click "Set up"
   - Follow the setup wizard

4. **Get Your Credentials**
   - In WhatsApp → API Setup:
     - Copy your **Phone number ID**
     - Generate a permanent **Access Token**
   - Add these to your `config.json`

5. **Add Test Number**
   - In WhatsApp → API Setup → To
   - Add your phone number as a recipient

## Step 5: Upload the Code

1. **Connect ESP32** via USB

2. **Upload firmware and config**
   ```bash
   # Upload code
   pio run --target upload
   
   # Upload configuration
   pio run --target uploadfs
   ```

3. **Monitor output** (optional)
   ```bash
   pio device monitor
   ```

## Step 6: Done! 🎉

Your device will:
- Connect to WiFi
- Sync time automatically
- Calculate today's solar forecast
- Display hourly data on screen
- Send WhatsApp summary at 7:00 AM

## Troubleshooting

### "WiFi connection failed"
- Double-check SSID and password
- Ensure using 2.4GHz network (not 5GHz)

### "Display shows nothing"
- Check all wire connections
- Try swapping MOSI/MISO if still not working

### "WhatsApp not received"
- Verify access token is valid
- Check phone number ID is correct
- Ensure recipient number includes country code: `+263771234567`
- Look at serial monitor for error messages

### "HTTP 401 Unauthorized"
- Your access token may have expired
- Generate a new permanent token in Facebook Developer Console

## Customization

### Change Your Location
Edit latitude/longitude in `config.json`:
```json
"location": {
  "latitude": -17.7831,  // Negative for Southern hemisphere
  "longitude": 31.0909   // Positive for East of Greenwich
}
```

### Change Panel Angle
Edit panel settings:
```json
"panel": {
  "tilt": 30,      // 0-90 degrees from horizontal
  "azimuth": 180   // 0=North, 90=East, 180=South, 270=West
}
```

### Change Notification Time
Edit notification settings:
```json
"notifications": {
  "hour": 7,    // 0-23 (24-hour format)
  "minute": 0   // 0-59
}
```

## WhatsApp Business API Notes

- **Free Tier**: 1,000 free messages per month
- **Rate Limits**: Check current limits in your Facebook app dashboard
- **Message Templates**: For production use, you may need to create message templates
- **Webhook**: Not required for sending messages only

## Need Help?

- Check the [full README](README.md) for detailed documentation
- Open an [issue on GitHub](https://github.com/yourusername/SolarGainESP32/issues)
- Review [WhatsApp Business API docs](https://developers.facebook.com/docs/whatsapp/cloud-api)

---

Enjoy your solar forecasts! ☀️