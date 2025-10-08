#include "ConfigManager.h"

ConfigManager::ConfigManager() : initialized(false) {
}

bool ConfigManager::begin() {
    // Initialize SPIFFS
    if (!SPIFFS.begin(true)) {
        Serial.println("Failed to mount SPIFFS");
        return false;
    }
    
    // Initialize Preferences
    preferences.begin("solarGain", false);
    
    initialized = true;
    return true;
}

bool ConfigManager::loadFromFile(const String& filename) {
    File file = SPIFFS.open(filename, "r");
    if (!file) {
        Serial.println("Failed to open config file");
        return false;
    }
    
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, file);
    file.close();
    
    if (error) {
        Serial.println("Failed to parse config file: " + String(error.c_str()));
        return false;
    }
    
    // Load WiFi config
    if (doc.containsKey("wifi")) {
        wifiConfig.ssid = doc["wifi"]["ssid"].as<String>();
        wifiConfig.password = doc["wifi"]["password"].as<String>();
    }
    
    // Load WhatsApp config
    if (doc.containsKey("whatsapp")) {
        whatsappConfig.phoneNumberId = doc["whatsapp"]["phone_number_id"].as<String>();
        whatsappConfig.accessToken = doc["whatsapp"]["access_token"].as<String>();
        whatsappConfig.recipientNumber = doc["whatsapp"]["recipient_number"].as<String>();
    }
    
    // Load location config
    if (doc.containsKey("location")) {
        locationConfig.name = doc["location"]["name"].as<String>();
        locationConfig.latitude = doc["location"]["latitude"];
        locationConfig.longitude = doc["location"]["longitude"];
        locationConfig.elevation = doc["location"]["elevation"];
        locationConfig.timezoneOffset = doc["location"]["timezone_offset"];
    }
    
    // Load panel config
    if (doc.containsKey("panel")) {
        panelConfig.tilt = doc["panel"]["tilt"];
        panelConfig.azimuth = doc["panel"]["azimuth"];
    }
    
    // Load notification config
    if (doc.containsKey("notifications")) {
        notificationConfig.enabled = doc["notifications"]["enabled"];
        notificationConfig.hour = doc["notifications"]["hour"];
        notificationConfig.minute = doc["notifications"]["minute"];
    }
    
    // Load sleep config
    if (doc.containsKey("sleep")) {
        sleepConfig.durationMinutes = doc["sleep"]["duration_minutes"];
    }
    
    Serial.println("Configuration loaded from file");
    return true;
}

void ConfigManager::saveToPreferences() {
    // Save WiFi credentials
    preferences.putString("wifi_ssid", wifiConfig.ssid);
    preferences.putString("wifi_pass", wifiConfig.password);
    
    // Save WhatsApp credentials (encrypted in real implementation)
    preferences.putString("wa_phone_id", whatsappConfig.phoneNumberId);
    preferences.putString("wa_token", whatsappConfig.accessToken);
    preferences.putString("wa_recipient", whatsappConfig.recipientNumber);
    
    // Save location settings
    preferences.putString("loc_name", locationConfig.name);
    preferences.putFloat("loc_lat", locationConfig.latitude);
    preferences.putFloat("loc_lon", locationConfig.longitude);
    preferences.putFloat("loc_elev", locationConfig.elevation);
    preferences.putInt("loc_tz", locationConfig.timezoneOffset);
    
    // Save panel settings
    preferences.putFloat("panel_tilt", panelConfig.tilt);
    preferences.putFloat("panel_azim", panelConfig.azimuth);
    
    // Save notification settings
    preferences.putBool("notif_enabled", notificationConfig.enabled);
    preferences.putInt("notif_hour", notificationConfig.hour);
    preferences.putInt("notif_min", notificationConfig.minute);
    
    // Save sleep settings
    preferences.putInt("sleep_mins", sleepConfig.durationMinutes);
    
    Serial.println("Configuration saved to preferences");
}

void ConfigManager::loadFromPreferences() {
    // Load WiFi credentials
    wifiConfig.ssid = preferences.getString("wifi_ssid", "");
    wifiConfig.password = preferences.getString("wifi_pass", "");
    
    // Load WhatsApp credentials
    whatsappConfig.phoneNumberId = preferences.getString("wa_phone_id", "");
    whatsappConfig.accessToken = preferences.getString("wa_token", "");
    whatsappConfig.recipientNumber = preferences.getString("wa_recipient", "");
    
    // Load location settings with defaults for Harare
    locationConfig.name = preferences.getString("loc_name", "32 George Road, Hatfield, Harare");
    locationConfig.latitude = preferences.getFloat("loc_lat", -17.7831);
    locationConfig.longitude = preferences.getFloat("loc_lon", 31.0909);
    locationConfig.elevation = preferences.getFloat("loc_elev", 650);
    locationConfig.timezoneOffset = preferences.getInt("loc_tz", 2);
    
    // Load panel settings
    panelConfig.tilt = preferences.getFloat("panel_tilt", 30);
    panelConfig.azimuth = preferences.getFloat("panel_azim", 180);
    
    // Load notification settings
    notificationConfig.enabled = preferences.getBool("notif_enabled", true);
    notificationConfig.hour = preferences.getInt("notif_hour", 7);
    notificationConfig.minute = preferences.getInt("notif_min", 0);
    
    // Load sleep settings
    sleepConfig.durationMinutes = preferences.getInt("sleep_mins", 30);
    
    Serial.println("Configuration loaded from preferences");
}

bool ConfigManager::loadConfig() {
    if (!initialized) {
        Serial.println("ConfigManager not initialized!");
        return false;
    }
    
    // First try to load from file
    bool fileLoaded = loadFromFile("/config.json");
    
    // Then load from preferences (overrides file values if they exist)
    loadFromPreferences();
    
    // If we loaded from file and preferences are empty, save to preferences
    if (fileLoaded && wifiConfig.ssid.length() == 0) {
        saveToPreferences();
    }
    
    return isValid();
}

void ConfigManager::saveConfig() {
    if (!initialized) {
        Serial.println("ConfigManager not initialized!");
        return;
    }
    
    saveToPreferences();
}

void ConfigManager::setWiFiConfig(const WiFiConfig& config) {
    wifiConfig = config;
}

void ConfigManager::setWhatsAppConfig(const WhatsAppConfig& config) {
    whatsappConfig = config;
}

void ConfigManager::setLocationConfig(const LocationConfig& config) {
    locationConfig = config;
}

void ConfigManager::setPanelConfig(const PanelConfig& config) {
    panelConfig = config;
}

void ConfigManager::setNotificationConfig(const NotificationConfig& config) {
    notificationConfig = config;
}

void ConfigManager::setSleepConfig(const SleepConfig& config) {
    sleepConfig = config;
}

void ConfigManager::factoryReset() {
    preferences.clear();
    
    // Set default values
    locationConfig.name = "32 George Road, Hatfield, Harare";
    locationConfig.latitude = -17.7831;
    locationConfig.longitude = 31.0909;
    locationConfig.elevation = 650;
    locationConfig.timezoneOffset = 2;
    
    panelConfig.tilt = 30;
    panelConfig.azimuth = 180;
    
    notificationConfig.enabled = true;
    notificationConfig.hour = 7;
    notificationConfig.minute = 0;
    
    sleepConfig.durationMinutes = 30;
    
    // Clear sensitive data
    wifiConfig.ssid = "";
    wifiConfig.password = "";
    whatsappConfig.phoneNumberId = "";
    whatsappConfig.accessToken = "";
    whatsappConfig.recipientNumber = "";
    
    Serial.println("Factory reset completed");
}

bool ConfigManager::isValid() {
    // Check if minimum required configuration is present
    bool wifiValid = wifiConfig.ssid.length() > 0 && wifiConfig.password.length() > 0;
    bool locationValid = locationConfig.latitude != 0 && locationConfig.longitude != 0;
    bool panelValid = panelConfig.tilt >= 0 && panelConfig.tilt <= 90;
    
    // WhatsApp is optional (only required if notifications are enabled)
    bool whatsappValid = true;
    if (notificationConfig.enabled) {
        whatsappValid = whatsappConfig.phoneNumberId.length() > 0 && 
                       whatsappConfig.accessToken.length() > 0 &&
                       whatsappConfig.recipientNumber.length() > 0;
    }
    
    return wifiValid && locationValid && panelValid && whatsappValid;
}
