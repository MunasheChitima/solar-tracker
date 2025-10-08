#include <unity.h>
#include "SolarCalc.h"

// Test location: Harare
const float TEST_LATITUDE = -17.7831;
const float TEST_LONGITUDE = 31.0909;
const float TEST_ELEVATION = 650;
const float TEST_PANEL_TILT = 30;
const float TEST_PANEL_AZIMUTH = 180;

SolarCalc* solarCalc;

void setUp(void) {
    solarCalc = new SolarCalc(TEST_LATITUDE, TEST_LONGITUDE, TEST_ELEVATION, 
                             TEST_PANEL_TILT, TEST_PANEL_AZIMUTH);
}

void tearDown(void) {
    delete solarCalc;
}

void test_solar_position_noon() {
    // Test solar position at noon on June 21 (winter solstice in southern hemisphere)
    // Expected: sun should be in the north at lower elevation
    
    DailyForecast forecast = solarCalc->calculateDailyForecast(2024, 6, 21);
    
    // Check that we have 24 hours of data
    TEST_ASSERT_EQUAL(24, forecast.hourlyData.size());
    
    // At noon (hour 12), we should have maximum irradiance for the day
    float noonIrradiance = forecast.hourlyData[12].irradiance;
    
    // Verify noon has higher irradiance than morning/evening
    TEST_ASSERT_GREATER_THAN(forecast.hourlyData[8].irradiance, noonIrradiance);
    TEST_ASSERT_GREATER_THAN(forecast.hourlyData[16].irradiance, noonIrradiance);
    
    // Verify total daily irradiance is reasonable (2-8 kWh/m² for winter)
    TEST_ASSERT_GREATER_THAN(2.0, forecast.totalIrradiance);
    TEST_ASSERT_LESS_THAN(8.0, forecast.totalIrradiance);
}

void test_solar_position_summer() {
    // Test solar position on December 21 (summer solstice)
    DailyForecast forecast = solarCalc->calculateDailyForecast(2024, 12, 21);
    
    // Summer should have higher total irradiance than winter
    TEST_ASSERT_GREATER_THAN(4.0, forecast.totalIrradiance);
    TEST_ASSERT_LESS_THAN(10.0, forecast.totalIrradiance);
    
    // Verify sunrise is earlier and sunset is later in summer
    int sunriseHour = -1;
    int sunsetHour = -1;
    
    for (int i = 0; i < 24; i++) {
        if (forecast.hourlyData[i].irradiance > 0 && sunriseHour == -1) {
            sunriseHour = i;
        }
        if (forecast.hourlyData[i].irradiance > 0) {
            sunsetHour = i;
        }
    }
    
    // In summer, expect sunrise around 5-6 AM and sunset around 6-7 PM
    TEST_ASSERT_GREATER_OR_EQUAL(4, sunriseHour);
    TEST_ASSERT_LESS_OR_EQUAL(6, sunriseHour);
    TEST_ASSERT_GREATER_OR_EQUAL(18, sunsetHour);
    TEST_ASSERT_LESS_OR_EQUAL(19, sunsetHour);
}

void test_night_hours_zero_irradiance() {
    DailyForecast forecast = solarCalc->calculateDailyForecast(2024, 9, 21);
    
    // Verify night hours have zero irradiance
    TEST_ASSERT_EQUAL_FLOAT(0.0, forecast.hourlyData[0].irradiance);  // Midnight
    TEST_ASSERT_EQUAL_FLOAT(0.0, forecast.hourlyData[3].irradiance);  // 3 AM
    TEST_ASSERT_EQUAL_FLOAT(0.0, forecast.hourlyData[22].irradiance); // 10 PM
    TEST_ASSERT_EQUAL_FLOAT(0.0, forecast.hourlyData[23].irradiance); // 11 PM
}

void test_panel_tilt_effect() {
    // Test with flat panel (0° tilt)
    SolarCalc flatPanel(TEST_LATITUDE, TEST_LONGITUDE, TEST_ELEVATION, 0, 180);
    DailyForecast flatForecast = flatPanel.calculateDailyForecast(2024, 6, 21);
    
    // Test with tilted panel (30° tilt)
    DailyForecast tiltedForecast = solarCalc->calculateDailyForecast(2024, 6, 21);
    
    // In winter (June), tilted panel should capture more energy
    TEST_ASSERT_GREATER_THAN(flatForecast.totalIrradiance, tiltedForecast.totalIrradiance);
}

void test_sunrise_sunset_times() {
    // Test sunrise/sunset calculation for equinox
    float sunrise = solarCalc->getSunriseTime(2024, 3, 21);
    float sunset = solarCalc->getSunsetTime(2024, 3, 21);
    
    // On equinox, sunrise should be around 6 AM and sunset around 6 PM
    TEST_ASSERT_GREATER_THAN(5.5, sunrise);
    TEST_ASSERT_LESS_THAN(6.5, sunrise);
    TEST_ASSERT_GREATER_THAN(17.5, sunset);
    TEST_ASSERT_LESS_THAN(18.5, sunset);
}

void test_elevation_effect() {
    // Test at sea level
    SolarCalc seaLevel(TEST_LATITUDE, TEST_LONGITUDE, 0, TEST_PANEL_TILT, TEST_PANEL_AZIMUTH);
    DailyForecast seaLevelForecast = seaLevel.calculateDailyForecast(2024, 6, 21);
    
    // Test at elevation (650m)
    DailyForecast elevatedForecast = solarCalc->calculateDailyForecast(2024, 6, 21);
    
    // Higher elevation should have slightly higher irradiance (less atmosphere)
    TEST_ASSERT_GREATER_THAN(seaLevelForecast.totalIrradiance, elevatedForecast.totalIrradiance);
}

// Main test runner
void runSolarCalcTests() {
    UNITY_BEGIN();
    
    RUN_TEST(test_solar_position_noon);
    RUN_TEST(test_solar_position_summer);
    RUN_TEST(test_night_hours_zero_irradiance);
    RUN_TEST(test_panel_tilt_effect);
    RUN_TEST(test_sunrise_sunset_times);
    RUN_TEST(test_elevation_effect);
    
    UNITY_END();
}

// For native testing
#ifdef UNIT_TEST
int main() {
    runSolarCalcTests();
    return 0;
}
#endif

// For ESP32 testing
#ifndef UNIT_TEST
void setup() {
    delay(2000);
    runSolarCalcTests();
}

void loop() {
    // Nothing to do
}
#endif
