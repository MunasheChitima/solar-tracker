#ifndef SOLAR_CALC_H
#define SOLAR_CALC_H

#include <Arduino.h>
#include <vector>

struct HourlyIrradiance {
    int hour;
    float irradiance; // kWh/m²
};

struct DailyForecast {
    float totalIrradiance; // kWh/m²
    std::vector<HourlyIrradiance> hourlyData;
    String date;
};

class SolarCalc {
private:
    float latitude;
    float longitude;
    float elevation;
    float panelTilt;
    float panelAzimuth;
    
    // Calculate Julian day number
    float getJulianDay(int year, int month, int day);
    
    // Calculate solar declination angle
    float getSolarDeclination(float julianDay);
    
    // Calculate equation of time
    float getEquationOfTime(float julianDay);
    
    // Calculate hour angle
    float getHourAngle(float localSolarTime);
    
    // Calculate solar elevation angle
    float getSolarElevation(float declination, float hourAngle);
    
    // Calculate solar azimuth angle
    float getSolarAzimuth(float declination, float hourAngle, float elevation);
    
    // Calculate air mass
    float getAirMass(float solarElevation);
    
    // Calculate direct normal irradiance (DNI)
    float getDirectNormalIrradiance(float airMass);
    
    // Calculate diffuse horizontal irradiance (DHI)
    float getDiffuseHorizontalIrradiance(float dni);
    
    // Calculate global horizontal irradiance (GHI)
    float getGlobalHorizontalIrradiance(float dni, float dhi, float solarElevation);
    
    // Calculate irradiance on tilted surface
    float getTiltedSurfaceIrradiance(float dni, float dhi, float solarElevation, 
                                    float solarAzimuth, float surfaceTilt, float surfaceAzimuth);

public:
    SolarCalc(float lat, float lon, float elev, float tilt, float azimuth);
    
    // Calculate hourly irradiance for a specific day
    DailyForecast calculateDailyForecast(int year, int month, int day);
    
    // Get sunrise and sunset times
    float getSunriseTime(int year, int month, int day);
    float getSunsetTime(int year, int month, int day);
};

#endif // SOLAR_CALC_H
