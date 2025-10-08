#ifndef CONFIG_MANAGER_H
#define CONFIG_MANAGER_H

#include <Arduino.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>

struct WiFiConfig {
    String ssid;
    String password;
};

struct WhatsAppConfig {
    String phoneNumberId;
    String accessToken;
    String recipientNumber;
};

struct LocationConfig {
    String name;
    float latitude;
    float longitude;
    float elevation;
    int timezoneOffset;
};

struct PanelConfig {
    float tilt;
    float azimuth;
};

struct NotificationConfig {
    bool enabled;
    int hour;
    int minute;
};

struct SleepConfig {
    int durationMinutes;
};

class ConfigManager {
private:
    Preferences preferences;
    bool initialized;
    
    // Configuration data
    WiFiConfig wifiConfig;
    WhatsAppConfig whatsappConfig;
    LocationConfig locationConfig;
    PanelConfig panelConfig;
    NotificationConfig notificationConfig;
    SleepConfig sleepConfig;
    
    // Load configuration from JSON file
    bool loadFromFile(const String& filename);
    
    // Save sensitive data to secure storage
    void saveToPreferences();
    
    // Load sensitive data from secure storage
    void loadFromPreferences();
    
public:
    ConfigManager();
    
    // Initialize configuration manager
    bool begin();
    
    // Load configuration (first from file, then from preferences)
    bool loadConfig();
    
    // Save current configuration to preferences
    void saveConfig();
    
    // Get configuration values
    WiFiConfig getWiFiConfig() { return wifiConfig; }
    WhatsAppConfig getWhatsAppConfig() { return whatsappConfig; }
    LocationConfig getLocationConfig() { return locationConfig; }
    PanelConfig getPanelConfig() { return panelConfig; }
    NotificationConfig getNotificationConfig() { return notificationConfig; }
    SleepConfig getSleepConfig() { return sleepConfig; }
    
    // Set configuration values
    void setWiFiConfig(const WiFiConfig& config);
    void setWhatsAppConfig(const WhatsAppConfig& config);
    void setLocationConfig(const LocationConfig& config);
    void setPanelConfig(const PanelConfig& config);
    void setNotificationConfig(const NotificationConfig& config);
    void setSleepConfig(const SleepConfig& config);
    
    // Reset to factory defaults
    void factoryReset();
    
    // Check if configuration is valid
    bool isValid();
};

#endif // CONFIG_MANAGER_H
