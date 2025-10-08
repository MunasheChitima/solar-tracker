# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Best Practices

### Environment Variables
- All sensitive data (API keys, tokens) are stored in environment variables
- Never commit `.env` files to version control
- Use Vercel's secure environment variable storage for production

### API Security
- Input validation on all API endpoints
- Rate limiting implemented via Vercel
- CORS properly configured
- No sensitive data exposed in client-side code

### Dependencies
- Regular dependency updates
- Security audit with `npm audit`
- Minimal dependency footprint

### Deployment Security
- HTTPS enforced in production
- Secure headers via Vercel
- No hardcoded credentials
- GitHub Actions secrets for CI/CD

## Reporting a Vulnerability

If you discover a security vulnerability, please:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to: Munashe.chitima@gmail.com
3. Include detailed information about the vulnerability
4. Allow reasonable time for response before public disclosure

## Security Checklist

- [ ] Environment variables properly configured
- [ ] API keys not exposed in client code
- [ ] Dependencies up to date
- [ ] HTTPS enforced
- [ ] Input validation implemented
- [ ] CORS properly configured
- [ ] No sensitive data in logs
- [ ] Secure deployment pipeline

## Data Privacy

This application:
- Does not store personal user data
- Uses location data only for solar calculations
- Respects user privacy
- Complies with data protection regulations
