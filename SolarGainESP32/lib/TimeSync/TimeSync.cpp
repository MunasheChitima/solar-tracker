#include "TimeSync.h"

TimeSync::TimeSync() : timeClient(nullptr), initialized(false), timezoneOffset(2) {
}

TimeSync::~TimeSync() {
    if (timeClient) {
        delete timeClient;
    }
}

void TimeSync::begin(int offsetHours) {
    timezoneOffset = offsetHours;
    
    // Initialize NTP client with pool.ntp.org and timezone offset
    timeClient = new NTPClient(ntpUDP, "pool.ntp.org", offsetHours * 3600, 60000);
    timeClient->begin();
    
    initialized = true;
    
    Serial.println("TimeSync initialized with timezone offset: GMT+" + String(offsetHours));
}

bool TimeSync::update() {
    if (!initialized || !timeClient) {
        Serial.println("TimeSync not initialized!");
        return false;
    }
    
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi not connected, cannot sync time");
        return false;
    }
    
    bool success = timeClient->update();
    
    if (success) {
        // Set the system time
        setTime(timeClient->getEpochTime());
        Serial.println("Time synchronized: " + getDateTimeString());
    } else {
        Serial.println("Failed to sync time from NTP server");
    }
    
    return success;
}

int TimeSync::getHour() {
    if (!initialized) return -1;
    return hour();
}

int TimeSync::getMinute() {
    if (!initialized) return -1;
    return minute();
}

int TimeSync::getSecond() {
    if (!initialized) return -1;
    return second();
}

int TimeSync::getDay() {
    if (!initialized) return -1;
    return day();
}

int TimeSync::getMonth() {
    if (!initialized) return -1;
    return month();
}

int TimeSync::getYear() {
    if (!initialized) return -1;
    return year();
}

String TimeSync::getTimeString() {
    if (!initialized) return "??:??:??";
    
    char buffer[9];
    snprintf(buffer, sizeof(buffer), "%02d:%02d:%02d", 
             getHour(), getMinute(), getSecond());
    return String(buffer);
}

String TimeSync::getDateString() {
    if (!initialized) return "????-??-??";
    
    char buffer[11];
    snprintf(buffer, sizeof(buffer), "%04d-%02d-%02d", 
             getYear(), getMonth(), getDay());
    return String(buffer);
}

String TimeSync::getDateTimeString() {
    return getDateString() + " " + getTimeString();
}

unsigned long TimeSync::getEpochTime() {
    if (!initialized || !timeClient) return 0;
    return timeClient->getEpochTime();
}

bool TimeSync::isSynchronized() {
    if (!initialized) return false;
    
    // Consider synchronized if we have a valid time (year > 2020)
    return getYear() > 2020;
}

time_t TimeSync::utcToLocal(time_t utc) {
    return utc + (timezoneOffset * 3600);
}

bool TimeSync::isScheduledTime(int targetHour, int targetMinute) {
    if (!initialized) return false;
    
    int currentHour = getHour();
    int currentMinute = getMinute();
    
    return (currentHour == targetHour && currentMinute == targetMinute);
}
