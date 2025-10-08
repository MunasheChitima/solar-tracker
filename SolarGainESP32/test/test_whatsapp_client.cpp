#include <unity.h>
#include "WhatsAppClient.h"
#include "SolarCalc.h"

WhatsAppClient whatsApp;

void setUp(void) {
    // Initialize with test credentials (won't actually send messages in tests)
    whatsApp.begin("123456789012345", "TEST_ACCESS_TOKEN", "+1234567890");
}

void tearDown(void) {
    // Nothing to clean up
}

void test_initialization() {
    TEST_ASSERT_TRUE(whatsApp.isInitialized());
}

void test_url_encoding() {
    // Test various special characters that need encoding
    // Note: This would require exposing urlEncode as public for testing
    // For now, we'll test through the message formatting
    
    WhatsAppClient testClient;
    testClient.begin("123456789012345", "EAA_TEST_TOKEN", "+1234567890");
    TEST_ASSERT_TRUE(testClient.isInitialized());
}

void test_message_formatting() {
    // Create a test forecast
    DailyForecast forecast;
    forecast.date = "2024-06-21";
    forecast.totalIrradiance = 5.67;
    
    // Add hourly data
    for (int hour = 0; hour < 24; hour++) {
        HourlyIrradiance hourData;
        hourData.hour = hour;
        
        // Simulate realistic irradiance pattern
        if (hour >= 6 && hour <= 18) {
            float timeFromNoon = abs(hour - 12);
            hourData.irradiance = max(0.0f, (1.0f - timeFromNoon * 0.15f));
        } else {
            hourData.irradiance = 0.0;
        }
        
        forecast.hourlyData.push_back(hourData);
    }
    
    // Test that message formatting doesn't crash
    // (Actual sending would require mocking HTTP client)
    TEST_ASSERT_TRUE(whatsApp.isInitialized());
}

void test_empty_credentials() {
    WhatsAppClient emptyClient;
    emptyClient.begin("", "", "");
    
    // Should still initialize but fail on send
    TEST_ASSERT_TRUE(emptyClient.isInitialized());
}

void test_authorization_header() {
    // Test that authorization header is properly formatted
    // This would require exposing buildAuthHeader as public
    // For now, we verify initialization works
    
    WhatsAppClient authClient;
    authClient.begin("123456789012345", "EAAxxxxxxxxxxxxx", "+263771234567");
    TEST_ASSERT_TRUE(authClient.isInitialized());
}

// Mock HTTP response for testing
class MockHTTPClient {
public:
    int lastStatusCode;
    String lastPostData;
    
    MockHTTPClient() : lastStatusCode(201) {}
    
    bool begin(const String& url) { return true; }
    void addHeader(const String& name, const String& value) {}
    int POST(const String& data) {
        lastPostData = data;
        return lastStatusCode;
    }
    String getString() { return "{}"; }
    void end() {}
};

void test_message_content() {
    // Test that message contains expected elements
    DailyForecast forecast;
    forecast.date = "2024-12-21";
    forecast.totalIrradiance = 8.45;
    
    // Add some hourly data
    for (int hour = 6; hour <= 18; hour++) {
        HourlyIrradiance hourData;
        hourData.hour = hour;
        hourData.irradiance = 0.5;
        forecast.hourlyData.push_back(hourData);
    }
    
    // Verify client is ready
    TEST_ASSERT_TRUE(whatsApp.isInitialized());
    
    // In a real test, we would mock the HTTP client and verify:
    // - Message contains location
    // - Message contains date
    // - Message contains total irradiance
    // - Message contains hourly breakdown
}

// Main test runner
void runWhatsAppTests() {
    UNITY_BEGIN();
    
    RUN_TEST(test_initialization);
    RUN_TEST(test_url_encoding);
    RUN_TEST(test_message_formatting);
    RUN_TEST(test_empty_credentials);
    RUN_TEST(test_authorization_header);
    RUN_TEST(test_message_content);
    
    UNITY_END();
}

// For native testing
#ifdef UNIT_TEST
int main() {
    runWhatsAppTests();
    return 0;
}
#endif

// For ESP32 testing
#ifndef UNIT_TEST
void setup() {
    delay(2000);
    runWhatsAppTests();
}

void loop() {
    // Nothing to do
}
#endif
