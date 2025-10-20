#include "Display.h"
// Note: PWM brightness for ESP32 is optional; fallback uses digital on/off

Display::Display() : tft(TFT_eSPI()), initialized(false) {
    // Set color scheme
    bgColor = TFT_BLACK;
    fgColor = TFT_WHITE;
    barColor = TFT_YELLOW;
    textColor = TFT_WHITE;
    gridColor = TFT_DARKGREY;
}

void Display::begin() {
    tft.init();
    tft.setRotation(1); // Landscape mode
    
    screenWidth = tft.width();
    screenHeight = tft.height();
    
    // Calculate chart dimensions
    chartX = 20;
    chartY = 50;
    chartWidth = screenWidth - 40;
    chartHeight = screenHeight - 100;
    barSpacing = 2;
    barWidth = (chartWidth - (24 - 1) * barSpacing) / 24; // derive from spacing
    
    // Set default font
    tft.setTextSize(1);
    tft.setTextColor(textColor, bgColor);
    
    // Turn on backlight
    pinMode(TFT_BL, OUTPUT);
    digitalWrite(TFT_BL, HIGH);
    
    initialized = true;
    clear();
}

void Display::clear() {
    tft.fillScreen(bgColor);
}

void Display::showSplashScreen() {
    clear();
    
    // Draw sun icon (simple circle with rays)
    int centerX = screenWidth / 2;
    int centerY = screenHeight / 2 - 20;
    int sunRadius = 30;
    
    tft.fillCircle(centerX, centerY, sunRadius, TFT_YELLOW);
    
    // Draw rays
    for (int i = 0; i < 8; i++) {
        float angle = i * PI / 4;
        int x1 = centerX + (sunRadius + 5) * cos(angle);
        int y1 = centerY + (sunRadius + 5) * sin(angle);
        int x2 = centerX + (sunRadius + 15) * cos(angle);
        int y2 = centerY + (sunRadius + 15) * sin(angle);
        tft.drawLine(x1, y1, x2, y2, TFT_YELLOW);
    }
    
    // Draw title
    tft.setTextSize(2);
    tft.setTextDatum(TC_DATUM);
    tft.drawString("SolarGain ESP32", centerX, centerY + 50);
    
    tft.setTextSize(1);
    tft.drawString("Solar Irradiance Forecast", centerX, centerY + 75);
    tft.drawString("Harare, Zimbabwe", centerX, centerY + 90);
    
    tft.setTextDatum(TL_DATUM); // Reset datum
}

void Display::showLoading(const String& message) {
    clear();
    
    tft.setTextSize(2);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("Loading...", screenWidth / 2, screenHeight / 2 - 20);
    
    tft.setTextSize(1);
    tft.drawString(message, screenWidth / 2, screenHeight / 2 + 10);
    
    tft.setTextDatum(TL_DATUM);
}

void Display::showError(const String& error) {
    clear();
    
    tft.setTextSize(2);
    tft.setTextColor(TFT_RED, bgColor);
    tft.setTextDatum(MC_DATUM);
    tft.drawString("ERROR", screenWidth / 2, screenHeight / 2 - 20);
    
    tft.setTextSize(1);
    tft.setTextColor(textColor, bgColor);
    
    // Word wrap error message
    int maxWidth = screenWidth - 40;
    int yPos = screenHeight / 2 + 10;
    String remaining = error;
    
    while (remaining.length() > 0) {
        int spacePos = remaining.lastIndexOf(' ', 40);
        if (spacePos == -1) spacePos = min(40, (int)remaining.length());
        
        String line = remaining.substring(0, spacePos);
        tft.drawString(line, screenWidth / 2, yPos);
        
        remaining = remaining.substring(spacePos);
        remaining.trim();
        yPos += 15;
    }
    
    tft.setTextDatum(TL_DATUM);
}

void Display::drawHeader(const String& title, const String& date) {
    tft.setTextSize(2);
    tft.setTextDatum(TC_DATUM);
    tft.drawString(title, screenWidth / 2, 10);
    
    tft.setTextSize(1);
    tft.drawString(date, screenWidth / 2, 30);
    tft.setTextDatum(TL_DATUM);
}

void Display::drawFooter(float totalIrradiance) {
    int yPos = screenHeight - 25;
    
    tft.setTextSize(1);
    tft.setTextDatum(TL_DATUM);
    tft.drawString("Daily Total:", 20, yPos);
    
    char buffer[20];
    snprintf(buffer, sizeof(buffer), "%.2f kWh/m2", totalIrradiance);
    
    tft.setTextSize(2);
    tft.setTextColor(TFT_GREEN, bgColor);
    tft.drawString(buffer, 100, yPos - 3);
    tft.setTextColor(textColor, bgColor);
    tft.setTextSize(1);
}

void Display::drawGrid() {
    // Draw axes
    tft.drawLine(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight, fgColor);
    tft.drawLine(chartX, chartY, chartX, chartY + chartHeight, fgColor);
    
    // Draw horizontal grid lines
    for (int i = 0; i <= 5; i++) {
        int y = chartY + (chartHeight * i / 5);
        tft.drawLine(chartX, y, chartX + chartWidth, y, gridColor);
        
        // Draw value labels
        float value = (5 - i) * 0.2; // 0 to 1.0 kWh/m²
        char buffer[10];
        snprintf(buffer, sizeof(buffer), "%.1f", value);
        tft.setTextDatum(MR_DATUM);
        tft.drawString(buffer, chartX - 5, y);
    }
    
    tft.setTextDatum(TL_DATUM);
}

void Display::drawTimeLabels() {
    tft.setTextSize(1);
    
    for (int hour = 0; hour < 24; hour += 3) {
        int x = chartX + hour * (barWidth + barSpacing) + barWidth / 2;
        int y = chartY + chartHeight + 5;
        
        char buffer[3];
        snprintf(buffer, sizeof(buffer), "%02d", hour);
        
        tft.setTextDatum(TC_DATUM);
        tft.drawString(buffer, x, y);
    }
    
    tft.setTextDatum(TL_DATUM);
}

void Display::drawBar(int hour, float value, float maxValue) {
    if (maxValue <= 0) maxValue = 1.0; // Prevent division by zero
    
    int x = chartX + hour * (barWidth + barSpacing);
    float barHeightRatio = constrain(value / maxValue, 0.0, 1.0);
    int barHeight = barHeightRatio * chartHeight;
    int y = chartY + chartHeight - barHeight;
    
    // Choose color based on irradiance level
    uint16_t color;
    if (value > 0.8) color = TFT_RED;
    else if (value > 0.6) color = TFT_ORANGE;
    else if (value > 0.4) color = TFT_YELLOW;
    else if (value > 0.2) color = TFT_GREENYELLOW;
    else if (value > 0) color = TFT_GREEN;
    else color = gridColor;
    
    // Draw bar
    if (barHeight > 0) {
        tft.fillRect(x, y, barWidth, barHeight, color);
    }
}

void Display::showDailyForecast(const DailyForecast& forecast) {
    clear();
    
    // Draw header
    drawHeader("Solar Forecast", forecast.date);
    
    // Draw grid
    drawGrid();
    
    // Find max value for scaling
    float maxValue = 0;
    for (const auto& hourData : forecast.hourlyData) {
        if (hourData.irradiance > maxValue) {
            maxValue = hourData.irradiance;
        }
    }
    
    // Round up to nearest 0.2
    maxValue = ceil(maxValue * 5) / 5;
    if (maxValue < 1.0) maxValue = 1.0;
    
    // Draw bars
    for (const auto& hourData : forecast.hourlyData) {
        drawBar(hourData.hour, hourData.irradiance, maxValue);
    }
    
    // Draw time labels
    drawTimeLabels();
    
    // Draw footer with total
    drawFooter(forecast.totalIrradiance);
}

void Display::showStatus(const String& time, const String& status, bool wifiConnected) {
    // Status bar at top
    tft.fillRect(0, 0, screenWidth, 20, TFT_DARKGREY);
    
    tft.setTextSize(1);
    tft.setTextColor(TFT_WHITE, TFT_DARKGREY);
    tft.setTextDatum(TL_DATUM);
    
    // Time on left
    tft.drawString(time, 5, 5);
    
    // WiFi status on right
    tft.setTextDatum(TR_DATUM);
    if (wifiConnected) {
        tft.setTextColor(TFT_GREEN, TFT_DARKGREY);
        tft.drawString("WiFi OK", screenWidth - 5, 5);
    } else {
        tft.setTextColor(TFT_RED, TFT_DARKGREY);
        tft.drawString("No WiFi", screenWidth - 5, 5);
    }
    
    // Status in center
    tft.setTextDatum(TC_DATUM);
    tft.setTextColor(TFT_WHITE, TFT_DARKGREY);
    tft.drawString(status, screenWidth / 2, 5);
    
    // Reset
    tft.setTextDatum(TL_DATUM);
    tft.setTextColor(textColor, bgColor);
}

void Display::updateHourBar(int hour, float value, float maxValue) {
    // Clear previous bar area
    int x = chartX + hour * (barWidth + barSpacing);
    tft.fillRect(x, chartY, barWidth, chartHeight, bgColor);
    
    // Draw new bar
    drawBar(hour, value, maxValue);
}

void Display::setBrightness(uint8_t brightness) {
    if (!initialized) return;

    // Fallback brightness: simple on/off based on threshold
    digitalWrite(TFT_BL, brightness >= 16 ? HIGH : LOW);
}

void Display::sleep() {
    digitalWrite(TFT_BL, LOW); // Turn off backlight
}

void Display::wake() {
    digitalWrite(TFT_BL, HIGH); // Turn on backlight
}
