#include "WhatsAppClient.h"
#include <ArduinoJson.h>

WhatsAppClient::WhatsAppClient() : initialized(false) {
}

void WhatsAppClient::begin(const String& phoneId, const String& token, const String& recipient) {
    phoneNumberId = phoneId;
    accessToken = token;
    recipientNumber = formatPhoneNumber(recipient);
    initialized = true;
    
    Serial.println("WhatsApp Business API client initialized");
    Serial.println("Phone Number ID: " + phoneNumberId);
}

String WhatsAppClient::buildApiUrl() {
    return String("https://") + apiHost + "/" + apiVersion + "/" + phoneNumberId + "/messages";
}

String WhatsAppClient::formatPhoneNumber(const String& number) {
    String formatted = number;
    
    // Remove any non-numeric characters except +
    formatted.replace("whatsapp:", "");
    formatted.replace(" ", "");
    formatted.replace("-", "");
    formatted.replace("(", "");
    formatted.replace(")", "");
    
    // Ensure it starts with country code
    if (!formatted.startsWith("+")) {
        formatted = "+" + formatted;
    }
    
    return formatted;
}

String WhatsAppClient::formatDailyMessage(const DailyForecast& forecast, const String& location) {
    String message = "🌞 *Solar Gain Forecast*\n";
    message += "📍 " + location + "\n";
    message += "📅 " + forecast.date + "\n\n";
    message += "⚡ *Daily Total: " + String(forecast.totalIrradiance, 2) + " kWh/m²*\n\n";
    message += "📊 *Hourly Breakdown:*\n";
    
    // Find sunrise and sunset hours
    int sunriseHour = -1;
    int sunsetHour = -1;
    
    for (int i = 0; i < forecast.hourlyData.size(); i++) {
        if (forecast.hourlyData[i].irradiance > 0 && sunriseHour == -1) {
            sunriseHour = i;
        }
        if (forecast.hourlyData[i].irradiance > 0) {
            sunsetHour = i;
        }
    }
    
    // Only show hours with sunlight
    if (sunriseHour >= 0 && sunsetHour >= 0) {
        for (int i = sunriseHour; i <= sunsetHour; i++) {
            char timeStr[6];
            snprintf(timeStr, sizeof(timeStr), "%02d:00", i);
            
            message += String(timeStr) + " → ";
            
            // Add visual bar representation
            float irr = forecast.hourlyData[i].irradiance;
            int bars = round(irr * 10); // Scale to 0-10 bars
            
            for (int j = 0; j < bars; j++) {
                message += "▪";
            }
            
            message += " " + String(irr, 2) + " kWh/m²\n";
        }
    }
    
    message += "\n🌅 Sunrise: " + String(sunriseHour) + ":00\n";
    message += "🌇 Sunset: " + String(sunsetHour) + ":00\n";
    
    return message;
}

String WhatsAppClient::buildMessagePayload(const String& recipient, const String& message) {
    StaticJsonDocument<2048> doc;
    
    doc["messaging_product"] = "whatsapp";
    doc["recipient_type"] = "individual";
    doc["to"] = recipient;
    doc["type"] = "text";
    
    JsonObject text = doc.createNestedObject("text");
    text["preview_url"] = false;
    text["body"] = message;
    
    String payload;
    serializeJson(doc, payload);
    return payload;
}

bool WhatsAppClient::sendMessage(const String& message) {
    if (!initialized) {
        Serial.println("WhatsApp client not initialized!");
        return false;
    }
    
    WiFiClientSecure client;
    // TODO: provide CA certificate for graph.facebook.com; fallback to insecure only if explicitly allowed
    #ifdef USE_INSECURE_TLS
      client.setInsecure();
    #else
      #ifdef FB_ROOT_CA_PEM
        client.setCACert(FB_ROOT_CA_PEM);
      #else
        client.setInsecure(); // Fallback until CA is provisioned
      #endif
    #endif

    HTTPClient https;
    String url = buildApiUrl();

    bool success = false;
    if (https.begin(client, url)) {
        https.addHeader("Authorization", "Bearer " + accessToken);
        https.addHeader("Content-Type", "application/json");

        String payload = buildMessagePayload(recipientNumber, message);
        Serial.println("Sending WhatsApp message...");

        int httpCode = https.POST(payload);
        String response = https.getString();
        Serial.println("HTTP Response code: " + String(httpCode));

        if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
            // Parse response to check for message ID
            StaticJsonDocument<512> responseDoc;
            if (deserializeJson(responseDoc, response) == DeserializationError::Ok) {
                if (responseDoc.containsKey("messages")) {
                    String messageId = responseDoc["messages"][0]["id"].as<String>();
                    Serial.println("Message ID: " + messageId);
                }
            }
            success = true;
        } else if (httpCode > 0) {
            // Log concise error
            Serial.println("Failed to send message. HTTP " + String(httpCode));
        } else {
            Serial.println("HTTP POST failed, error: " + https.errorToString(httpCode));
        }
        https.end();
    } else {
        Serial.println("Failed to connect to WhatsApp Business API");
    }

    return success;
}

bool WhatsAppClient::sendDailyForecast(const DailyForecast& forecast, const String& location) {
    String message = formatDailyMessage(forecast, location);
    return sendMessage(message);
}

bool WhatsAppClient::testConnection() {
    if (!initialized) {
        Serial.println("WhatsApp client not initialized!");
        return false;
    }
    
    WiFiClientSecure client;
    #ifdef USE_INSECURE_TLS
      client.setInsecure();
    #else
      #ifdef FB_ROOT_CA_PEM
        client.setCACert(FB_ROOT_CA_PEM);
      #else
        client.setInsecure();
      #endif
    #endif

    HTTPClient https;
    String url = String("https://") + apiHost + "/" + apiVersion + "/" + phoneNumberId;

    bool ok = false;
    if (https.begin(client, url)) {
        https.addHeader("Authorization", "Bearer " + accessToken);
        int httpCode = https.GET();
        if (httpCode == HTTP_CODE_OK) {
            String response = https.getString();
            StaticJsonDocument<512> doc;
            if (deserializeJson(doc, response) == DeserializationError::Ok) {
                if (doc.containsKey("display_phone_number")) {
                    String displayNumber = doc["display_phone_number"].as<String>();
                    Serial.println("Connected phone number: " + displayNumber);
                }
            }
            ok = true;
        } else {
            Serial.println("WhatsApp Business API connection test failed. HTTP code: " + String(httpCode));
        }
        https.end();
    } else {
        Serial.println("Failed to connect to WhatsApp Business API");
    }
    return ok;
}