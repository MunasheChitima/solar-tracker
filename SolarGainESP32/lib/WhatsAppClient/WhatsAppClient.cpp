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
    client.setInsecure(); // For simplicity, skip certificate validation
    
    HTTPClient https;
    
    String url = buildApiUrl();
    
    if (!https.begin(client, url)) {
        Serial.println("Failed to connect to WhatsApp Business API");
        return false;
    }
    
    // Set headers
    https.addHeader("Authorization", "Bearer " + accessToken);
    https.addHeader("Content-Type", "application/json");
    
    // Build JSON payload
    String payload = buildMessagePayload(recipientNumber, message);
    
    Serial.println("Sending WhatsApp message...");
    Serial.println("URL: " + url);
    
    int httpCode = https.POST(payload);
    
    if (httpCode > 0) {
        String response = https.getString();
        Serial.println("HTTP Response code: " + String(httpCode));
        
        if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
            Serial.println("Message sent successfully!");
            
            // Parse response to check for message ID
            StaticJsonDocument<512> responseDoc;
            if (deserializeJson(responseDoc, response) == DeserializationError::Ok) {
                if (responseDoc.containsKey("messages")) {
                    String messageId = responseDoc["messages"][0]["id"].as<String>();
                    Serial.println("Message ID: " + messageId);
                }
            }
            
            return true;
        } else {
            Serial.println("Failed to send message. Response: " + response);
            
            // Parse error response
            StaticJsonDocument<512> errorDoc;
            if (deserializeJson(errorDoc, response) == DeserializationError::Ok) {
                if (errorDoc.containsKey("error")) {
                    String errorMessage = errorDoc["error"]["message"].as<String>();
                    int errorCode = errorDoc["error"]["code"];
                    Serial.println("Error " + String(errorCode) + ": " + errorMessage);
                }
            }
            
            return false;
        }
    } else {
        Serial.println("HTTP POST failed, error: " + https.errorToString(httpCode));
        return false;
    }
    
    https.end();
    return false;
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
    client.setInsecure();
    
    HTTPClient https;
    
    // Test endpoint to get phone number details
    String url = String("https://") + apiHost + "/" + apiVersion + "/" + phoneNumberId;
    
    if (!https.begin(client, url)) {
        Serial.println("Failed to connect to WhatsApp Business API");
        return false;
    }
    
    https.addHeader("Authorization", "Bearer " + accessToken);
    
    int httpCode = https.GET();
    
    if (httpCode == HTTP_CODE_OK) {
        String response = https.getString();
        Serial.println("WhatsApp Business API connection test successful!");
        
        // Parse response to show phone number details
        StaticJsonDocument<512> doc;
        if (deserializeJson(doc, response) == DeserializationError::Ok) {
            if (doc.containsKey("display_phone_number")) {
                String displayNumber = doc["display_phone_number"].as<String>();
                Serial.println("Connected phone number: " + displayNumber);
            }
        }
        
        https.end();
        return true;
    } else {
        Serial.println("WhatsApp Business API connection test failed. HTTP code: " + String(httpCode));
        if (httpCode > 0) {
            Serial.println("Response: " + https.getString());
        }
        https.end();
        return false;
    }
}