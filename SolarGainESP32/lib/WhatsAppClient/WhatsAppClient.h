#ifndef WHATSAPP_CLIENT_H
#define WHATSAPP_CLIENT_H

#include <Arduino.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include "../SolarCalc/SolarCalc.h"
#include "FBRootCA.h"

class WhatsAppClient {
private:
    String phoneNumberId;
    String accessToken;
    String recipientNumber;
    bool initialized;
    
    // WhatsApp Business API endpoint
    const char* apiHost = "graph.facebook.com";
    const char* apiVersion = "v18.0";
    const int apiPort = 443;
    
    // Build API URL
    String buildApiUrl();
    
    // Format phone number (remove special characters)
    String formatPhoneNumber(const String& number);
    
    // Format message body for WhatsApp
    String formatDailyMessage(const DailyForecast& forecast, const String& location);
    
    // Build JSON payload for API
    String buildMessagePayload(const String& recipient, const String& message);
    
public:
    WhatsAppClient();
    
    // Initialize with WhatsApp Business API credentials
    void begin(const String& phoneId, const String& token, const String& recipient);
    
    // Send WhatsApp message
    bool sendMessage(const String& message);
    
    // Send daily solar forecast
    bool sendDailyForecast(const DailyForecast& forecast, const String& location);
    
    // Test connection to WhatsApp Business API
    bool testConnection();
    
    // Check if client is initialized
    bool isInitialized() { return initialized; }
};

#endif // WHATSAPP_CLIENT_H