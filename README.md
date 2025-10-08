# Solar Tracker Project

A comprehensive solar irradiance forecasting system consisting of an ESP32-based solar tracker and a web dashboard for monitoring and analysis.

## Project Structure

```
Solar Tracker/
├── SolarGainESP32/          # ESP32 firmware and libraries
│   ├── src/                 # Main firmware code
│   ├── lib/                 # Custom libraries
│   └── data/                # Configuration files
├── SolarGainESP32-web/      # Web dashboard
│   ├── public/              # Static web files
│   ├── server/              # Node.js backend
│   └── package.json         # Dependencies
├── .github/workflows/       # GitHub Actions
└── vercel.json             # Vercel deployment config
```

## Features

### ESP32 Solar Tracker
- Real-time solar position calculation
- Automatic panel positioning
- Weather data integration
- WhatsApp notifications
- Configuration management

### Web Dashboard
- Hourly irradiance forecasting
- Interactive solar panel configuration
- Weather data visualization
- CSV export functionality
- Responsive design

## Quick Start

### Web Dashboard
1. Navigate to the web directory:
   ```bash
   cd SolarGainESP32-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### ESP32 Firmware
1. Install PlatformIO
2. Open the project in your IDE
3. Configure your settings in `data/config.json`
4. Upload to your ESP32 device

## Deployment

### Vercel Deployment
This project is configured for automatic deployment to Vercel:

1. **Set up Vercel secrets in GitHub:**
   - `VERCEL_TOKEN`: Your Vercel API token
   - `VERCEL_ORG_ID`: Your Vercel organization ID
   - `VERCEL_PROJECT_ID`: Your Vercel project ID

2. **Configure environment variables in Vercel:**
   - `GOOGLE_MAPS_API_KEY`: Your Google Maps API key

3. **Deploy:**
   - Push to main branch triggers automatic deployment
   - Or deploy manually via Vercel CLI

### Manual Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Environment Variables

### Required
- `GOOGLE_MAPS_API_KEY`: Google Maps API key for geocoding and timezone services

### Optional
- `PORT`: Server port (default: 8787)
- `NODE_ENV`: Environment (development/production)

## API Endpoints

- `GET /api/places/autocomplete` - Address autocomplete
- `GET /api/places/details` - Place details
- `GET /api/timezone` - Timezone information
- `GET /api/weather` - Weather data

## Security Features

- Environment variables for sensitive data
- CORS configuration
- Input validation
- Secure API key handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.

---

Made with ☀️ for sustainable energy solutions
