# Migration Guide: Twilio to WhatsApp Business API

This guide helps you migrate from v1.0.0 (using Twilio) to v2.0.0 (using WhatsApp Business API).

## Why the Change?

- **Direct Integration**: No third-party service dependency
- **Cost Effective**: WhatsApp Business API offers 1,000 free messages per month
- **Better Features**: Richer message formatting and media support
- **Reliability**: Direct connection to Meta's infrastructure

## Step-by-Step Migration

### 1. Set Up WhatsApp Business API

#### Create Facebook Developer Account
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Sign up or log in with your Facebook account
3. Complete developer verification if required

#### Create a Business App
1. Navigate to "My Apps" → "Create App"
2. Select "Business" as the app type
3. Fill in your app details:
   - App name: "SolarGain WhatsApp"
   - Contact email: your email
   - Business Account: Create new or select existing

#### Add WhatsApp Product
1. In your app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set up"
3. Accept the terms and conditions

### 2. Get Your Credentials

#### Phone Number ID
1. Go to WhatsApp → API Setup
2. You'll see a test phone number provided by Meta
3. Copy the "Phone number ID" (a long numeric string)

#### Access Token
1. In the same API Setup page
2. Click "Generate" under Temporary access token
3. For production, create a System User and generate a permanent token:
   - Go to Business Settings → Users → System Users
   - Create a new system user
   - Assign "WhatsApp Business Management" permission
   - Generate token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions

### 3. Update Your Configuration

#### Old config.json (v1.0.0 - Twilio)
```json
{
  "twilio": {
    "account_sid": "ACxxxxxxxxxx",
    "auth_token": "xxxxxxxxxx",
    "from_number": "whatsapp:+14155238886",
    "to_number": "whatsapp:+263771234567"
  }
}
```

#### New config.json (v2.0.0 - WhatsApp Business API)
```json
{
  "whatsapp": {
    "phone_number_id": "123456789012345",
    "access_token": "EAAxxxxxxxxxx",
    "recipient_number": "+263771234567"
  }
}
```

### 4. Update Your ESP32

1. **Update the firmware**:
   ```bash
   git pull origin main
   pio run --target clean
   pio run --target upload
   ```

2. **Update configuration**:
   ```bash
   pio run --target uploadfs
   ```

### 5. Test Your Setup

1. Open serial monitor: `pio device monitor`
2. Watch for connection messages
3. The device should:
   - Connect to WiFi
   - Test WhatsApp API connection
   - Send a test message at the configured time

## Differences to Note

### Message Sending
- **Twilio**: Required "whatsapp:" prefix for numbers
- **WhatsApp API**: Uses standard international format (+country code)

### Rate Limits
- **Twilio**: Depends on your plan
- **WhatsApp API**: 
  - Free tier: 1,000 messages/month
  - Rate limit: 80 messages/minute

### Authentication
- **Twilio**: Account SID + Auth Token
- **WhatsApp API**: Phone Number ID + Access Token

### API Response
- **Twilio**: Returns message SID
- **WhatsApp API**: Returns message ID and status

## Troubleshooting

### "401 Unauthorized" Error
- Access token has expired
- Generate a new permanent token
- Ensure token has correct permissions

### "Phone number not found" Error
- Wrong phone number ID
- Check in WhatsApp → API Setup

### Messages not delivered
- Recipient hasn't accepted messages from your number
- For testing, use the test number's QR code to start a conversation
- For production, need verified business account

## Advanced Features (v2.0.0)

### Message Templates
For production use with verified business:
```json
{
  "messaging_product": "whatsapp",
  "to": "+263771234567",
  "type": "template",
  "template": {
    "name": "solar_daily_report",
    "language": { "code": "en" },
    "components": [{
      "type": "body",
      "parameters": [
        {"type": "text", "text": "5.67"},
        {"type": "text", "text": "06:00"},
        {"type": "text", "text": "18:00"}
      ]
    }]
  }
}
```

### Media Messages
Send charts as images:
```cpp
// Future enhancement
whatsApp.sendImage(chartImageUrl, "Daily Solar Forecast");
```

## Rollback Instructions

If you need to go back to Twilio:
1. Checkout v1.0.0: `git checkout v1.0.0`
2. Restore old config.json with Twilio credentials
3. Re-upload firmware and configuration

## Support

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Project Issues](https://github.com/yourusername/SolarGainESP32/issues)

---

Questions? Open an issue on GitHub!
