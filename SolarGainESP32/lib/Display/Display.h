#ifndef DISPLAY_H
#define DISPLAY_H

#include <Arduino.h>
#include <TFT_eSPI.h>
#include <vector>
#include "../SolarCalc/SolarCalc.h"

class Display {
private:
    TFT_eSPI tft;
    int screenWidth;
    int screenHeight;
    bool initialized;
    
    // Color scheme
    uint16_t bgColor;
    uint16_t fgColor;
    uint16_t barColor;
    uint16_t textColor;
    uint16_t gridColor;
    
    // Layout parameters
    int chartX;
    int chartY;
    int chartWidth;
    int chartHeight;
    int barWidth;
    int barSpacing;
    
    // Draw helper functions
    void drawHeader(const String& title, const String& date);
    void drawFooter(float totalIrradiance);
    void drawGrid();
    void drawBar(int hour, float value, float maxValue);
    void drawTimeLabels();
    
public:
    Display();
    
    // Initialize display
    void begin();
    
    // Clear screen
    void clear();
    
    // Display splash screen
    void showSplashScreen();
    
    // Display loading message
    void showLoading(const String& message);
    
    // Display error message
    void showError(const String& error);
    
    // Display hourly irradiance chart
    void showDailyForecast(const DailyForecast& forecast);
    
    // Display current time and status
    void showStatus(const String& time, const String& status, bool wifiConnected);
    
    // Update single hour bar
    void updateHourBar(int hour, float value, float maxValue);
    
    // Set display brightness (0-255)
    void setBrightness(uint8_t brightness);
    
    // Power save mode
    void sleep();
    void wake();
};

#endif // DISPLAY_H
