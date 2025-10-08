#include "SolarCalc.h"
#include <math.h>

SolarCalc::SolarCalc(float lat, float lon, float elev, float tilt, float azimuth) 
    : latitude(lat), longitude(lon), elevation(elev), panelTilt(tilt), panelAzimuth(azimuth) {
}

float SolarCalc::getJulianDay(int year, int month, int day) {
    int a = (14 - month) / 12;
    int y = year + 4800 - a;
    int m = month + 12 * a - 3;
    
    return day + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045;
}

float SolarCalc::getSolarDeclination(float julianDay) {
    // Calculate the day angle
    float dayAngle = 2 * PI * (julianDay - 1) / 365.25;
    
    // Spencer's equation for solar declination
    float declination = 0.006918 - 0.399912 * cos(dayAngle) + 0.070257 * sin(dayAngle)
                       - 0.006758 * cos(2 * dayAngle) + 0.000907 * sin(2 * dayAngle)
                       - 0.002697 * cos(3 * dayAngle) + 0.00148 * sin(3 * dayAngle);
    
    return declination;
}

float SolarCalc::getEquationOfTime(float julianDay) {
    float B = 2 * PI * (julianDay - 81) / 365.0;
    float E = 229.2 * (0.000075 + 0.001868 * cos(B) - 0.032077 * sin(B)
              - 0.014615 * cos(2 * B) - 0.04089 * sin(2 * B));
    return E; // in minutes
}

float SolarCalc::getHourAngle(float localSolarTime) {
    return 15.0 * (localSolarTime - 12.0) * PI / 180.0; // Convert to radians
}

float SolarCalc::getSolarElevation(float declination, float hourAngle) {
    float latRad = latitude * PI / 180.0;
    
    float sinElevation = sin(latRad) * sin(declination) + 
                        cos(latRad) * cos(declination) * cos(hourAngle);
    
    return asin(sinElevation);
}

float SolarCalc::getSolarAzimuth(float declination, float hourAngle, float elevation) {
    float latRad = latitude * PI / 180.0;
    
    float cosAzimuth = (sin(declination) * cos(latRad) - cos(declination) * sin(latRad) * cos(hourAngle)) / cos(elevation);
    float azimuth = acos(constrain(cosAzimuth, -1.0, 1.0));
    
    if (hourAngle > 0) {
        azimuth = 2 * PI - azimuth;
    }
    
    return azimuth;
}

float SolarCalc::getAirMass(float solarElevation) {
    if (solarElevation <= 0) return 40.0; // Maximum air mass for very low sun
    
    float elevationDeg = solarElevation * 180.0 / PI;
    
    // Kasten and Young formula
    float am = 1.0 / (sin(solarElevation) + 0.50572 * pow(elevationDeg + 6.07995, -1.6364));
    
    // Correct for altitude
    float pressureRatio = exp(-elevation / 8000.0); // Scale height ~8000m
    
    return am * pressureRatio;
}

float SolarCalc::getDirectNormalIrradiance(float airMass) {
    if (airMass > 40.0) return 0.0;
    
    // Clear sky model - simplified
    float solarConstant = 1367.0; // W/m²
    float k = 0.75 + 2e-5 * elevation; // Atmospheric extinction coefficient
    
    float dni = solarConstant * exp(-k * airMass);
    
    return max(0.0f, dni);
}

float SolarCalc::getDiffuseHorizontalIrradiance(float dni) {
    // Simple model: DHI = 10% of DNI for clear sky
    return 0.1 * dni;
}

float SolarCalc::getGlobalHorizontalIrradiance(float dni, float dhi, float solarElevation) {
    if (solarElevation <= 0) return 0.0;
    
    return dni * sin(solarElevation) + dhi;
}

float SolarCalc::getTiltedSurfaceIrradiance(float dni, float dhi, float solarElevation, 
                                           float solarAzimuth, float surfaceTilt, float surfaceAzimuth) {
    if (solarElevation <= 0) return 0.0;
    
    float tiltRad = surfaceTilt * PI / 180.0;
    float surfaceAzRad = surfaceAzimuth * PI / 180.0;
    
    // Angle of incidence
    float cosIncidence = sin(solarElevation) * cos(tiltRad) +
                        cos(solarElevation) * sin(tiltRad) * cos(solarAzimuth - surfaceAzRad);
    
    cosIncidence = max(0.0f, cosIncidence);
    
    // Direct component on tilted surface
    float directTilted = dni * cosIncidence;
    
    // Diffuse component (isotropic model)
    float diffuseTilted = dhi * (1 + cos(tiltRad)) / 2.0;
    
    // Ground reflected component (albedo = 0.2)
    float ghi = getGlobalHorizontalIrradiance(dni, dhi, solarElevation);
    float groundReflected = 0.2 * ghi * (1 - cos(tiltRad)) / 2.0;
    
    return directTilted + diffuseTilted + groundReflected;
}

DailyForecast SolarCalc::calculateDailyForecast(int year, int month, int day) {
    DailyForecast forecast;
    forecast.totalIrradiance = 0.0;
    forecast.date = String(year) + "-" + String(month) + "-" + String(day);
    
    float julianDay = getJulianDay(year, month, day);
    float declination = getSolarDeclination(julianDay);
    float eot = getEquationOfTime(julianDay);
    
    // Calculate for each hour of the day
    for (int hour = 0; hour < 24; hour++) {
        // Convert local time to solar time
        float localTime = hour + 0.5; // Middle of the hour
        float solarTime = localTime + eot / 60.0 + longitude / 15.0;
        
        float hourAngle = getHourAngle(solarTime);
        float elevation = getSolarElevation(declination, hourAngle);
        
        float hourlyIrradiance = 0.0;
        
        if (elevation > 0) {
            float azimuth = getSolarAzimuth(declination, hourAngle, elevation);
            float airMass = getAirMass(elevation);
            
            float dni = getDirectNormalIrradiance(airMass);
            float dhi = getDiffuseHorizontalIrradiance(dni);
            
            // Calculate irradiance on tilted panel
            float tiltedIrradiance = getTiltedSurfaceIrradiance(dni, dhi, elevation, azimuth, 
                                                               panelTilt, panelAzimuth);
            
            // Convert W/m² to kWh/m² for one hour
            hourlyIrradiance = tiltedIrradiance / 1000.0;
        }
        
        HourlyIrradiance hourData;
        hourData.hour = hour;
        hourData.irradiance = hourlyIrradiance;
        forecast.hourlyData.push_back(hourData);
        
        forecast.totalIrradiance += hourlyIrradiance;
    }
    
    return forecast;
}

float SolarCalc::getSunriseTime(int year, int month, int day) {
    float julianDay = getJulianDay(year, month, day);
    float declination = getSolarDeclination(julianDay);
    float eot = getEquationOfTime(julianDay);
    
    float latRad = latitude * PI / 180.0;
    
    // Calculate sunrise hour angle
    float cosHourAngle = -tan(latRad) * tan(declination);
    
    if (cosHourAngle > 1.0) return -1; // No sunrise (polar night)
    if (cosHourAngle < -1.0) return -1; // No sunset (polar day)
    
    float hourAngle = acos(cosHourAngle);
    float sunriseTime = 12.0 - hourAngle * 180.0 / PI / 15.0;
    
    // Convert solar time to local time
    sunriseTime = sunriseTime - eot / 60.0 - longitude / 15.0;
    
    return sunriseTime;
}

float SolarCalc::getSunsetTime(int year, int month, int day) {
    float julianDay = getJulianDay(year, month, day);
    float declination = getSolarDeclination(julianDay);
    float eot = getEquationOfTime(julianDay);
    
    float latRad = latitude * PI / 180.0;
    
    // Calculate sunset hour angle
    float cosHourAngle = -tan(latRad) * tan(declination);
    
    if (cosHourAngle > 1.0) return -1; // No sunrise (polar night)
    if (cosHourAngle < -1.0) return -1; // No sunset (polar day)
    
    float hourAngle = acos(cosHourAngle);
    float sunsetTime = 12.0 + hourAngle * 180.0 / PI / 15.0;
    
    // Convert solar time to local time
    sunsetTime = sunsetTime - eot / 60.0 - longitude / 15.0;
    
    return sunsetTime;
}
