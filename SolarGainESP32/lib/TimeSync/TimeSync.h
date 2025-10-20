#ifndef TIME_SYNC_H
#define TIME_SYNC_H

#include <Arduino.h>
#include <WiFi.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <TimeLib.h>

class TimeSync {
private:
    WiFiUDP ntpUDP;
    NTPClient* timeClient;
    int timezoneOffset;
    bool initialized;
    int lastFiredDay;
    int lastFiredMinute;
    
public:
    TimeSync();
    ~TimeSync();
    
    // Initialize NTP client with timezone offset (in hours)
    void begin(int offsetHours = 2); // Default to GMT+2 for Harare
    
    // Update time from NTP server
    bool update();
    
    // Get current time components
    int getHour();
    int getMinute();
    int getSecond();
    int getDay();
    int getMonth();
    int getYear();
    
    // Get formatted time strings
    String getTimeString();
    String getDateString();
    String getDateTimeString();
    
    // Get Unix timestamp
    unsigned long getEpochTime();
    
    // Check if time is synchronized
    bool isSynchronized();
    
    // Get timezone offset
    int getTimezoneOffset() { return timezoneOffset; }
    
    // Convert UTC to local time
    time_t utcToLocal(time_t utc);
    
    // Check if it's time for scheduled task
    bool isScheduledTime(int targetHour, int targetMinute);
};

#endif // TIME_SYNC_H
