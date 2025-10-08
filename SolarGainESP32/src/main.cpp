// Display + LED test for ESP32-S3 DevKitC-1 using TFT_eSPI
#include <Arduino.h>
#include <TFT_eSPI.h>

#ifndef TFT_BL
#define TFT_BL 21
#endif

static TFT_eSPI tft = TFT_eSPI();

void drawTestPattern() {
    tft.fillScreen(TFT_BLACK);
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(TFT_GREEN, TFT_BLACK);
    tft.drawString("DISPLAY TEST", tft.width() / 2, tft.height() / 2 - 20, 4);
    tft.setTextColor(TFT_YELLOW, TFT_BLACK);
    tft.drawString("If you see this, OK", tft.width() / 2, tft.height() / 2 + 10, 2);

    // Color bars at the bottom
    int h = 12;
    int y = tft.height() - h - 6;
    int w = tft.width() / 6;
    tft.fillRect(0 * w, y, w, h, TFT_RED);
    tft.fillRect(1 * w, y, w, h, TFT_ORANGE);
    tft.fillRect(2 * w, y, w, h, TFT_YELLOW);
    tft.fillRect(3 * w, y, w, h, TFT_GREEN);
    tft.fillRect(4 * w, y, w, h, TFT_BLUE);
    tft.fillRect(5 * w, y, w, h, TFT_CYAN);
}

void setup() {
    Serial.begin(115200);
    delay(300);
    Serial.println("\n\n[TEST] Starting Display + LED test");

    // Backlight
    pinMode(TFT_BL, OUTPUT);
    // Probe both polarities so we handle active-LOW/active-HIGH panels
    for (int i = 0; i < 2; ++i) {
        digitalWrite(TFT_BL, i == 0 ? LOW : HIGH);
        Serial.printf("[TEST] Backlight pin %d set %s\n", TFT_BL, i == 0 ? "LOW" : "HIGH");
        delay(500);
    }
    // Leave backlight HIGH by default
    digitalWrite(TFT_BL, HIGH);

    // TFT init
    tft.init();
    Serial.println("[TEST] Cycling rotations 0..3 with solid colors");
    for (uint8_t r = 0; r < 4; ++r) {
        tft.setRotation(r);
        tft.fillScreen(r % 2 ? TFT_BLUE : TFT_RED);
        tft.setTextColor(TFT_WHITE, r % 2 ? TFT_BLUE : TFT_RED);
        tft.setTextDatum(MC_DATUM);
        char msg[48];
        snprintf(msg, sizeof(msg), "Rotation %u %dx%d", r, tft.width(), tft.height());
        tft.drawString(msg, tft.width() / 2, tft.height() / 2, 2);
        delay(400);
    }
    tft.setRotation(1);
    drawTestPattern();
    Serial.printf("[TEST] TFT initialized: %dx%d\n", tft.width(), tft.height());

#ifdef LED_BUILTIN
    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LED_BUILTIN, LOW);
    Serial.printf("[TEST] LED_BUILTIN on pin %d\n", LED_BUILTIN);
#else
    Serial.println("[TEST] LED_BUILTIN not defined on this board");
#endif
}

void loop() {
    static uint32_t tick = 0;
    // Blink LED if available
#ifdef LED_BUILTIN
    digitalWrite(LED_BUILTIN, (tick % 2) ? HIGH : LOW);
#endif
    // Small on-screen heartbeat
    tft.setTextDatum(TR_DATUM);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    char buf[32];
    snprintf(buf, sizeof(buf), "HB %lu", (unsigned long)tick);
    tft.fillRect(tft.width() - 70, 0, 70, 18, TFT_BLACK);
    tft.drawString(buf, tft.width() - 4, 2, 2);
    Serial.printf("[TEST] Heartbeat %lu\n", (unsigned long)tick++);
    delay(500);
}
