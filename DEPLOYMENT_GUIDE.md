# Traders Journal - Deployment Guide

## Overview
This guide covers the complete deployment process for the Traders Journal app to production using Netlify, including domain setup, email configuration, and environment variables.

## Domain Configuration

### Primary Domain: `tradersjournal.pro`

The application has been configured to use `https://tradersjournal.pro` as the primary domain. All email templates, links, and references have been updated accordingly.

## Email Service Configuration

### Current Email Addresses
- `noreply@tradersjournal.pro` - General notifications (friend requests, trade sharing, medal achievements)
- `reports@tradersjournal.pro` - Trade reports and analytics
- `support@tradersjournal.pro` - Support communications (recommended)

### Resend Email Service Setup

1. **Domain Verification in Resend:**
   - Log into your Resend dashboard
   - Go to Domains section
   - Add `tradersjournal.pro` as a verified domain
   - Follow the DNS setup instructions provided by Resend

2. **DNS Records Required:**
   ```
   Type: TXT
   Name: @
   Value: resend-verification=your-verification-code
   
   Type: CNAME
   Name: resend
   Value: track.resend.com
   ```

3. **SPF Record:**
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:_spf.resend.com ~all
   ```

4. **DKIM Records:**
   - Resend will provide specific DKIM records during domain verification
   - Add these to your DNS provider

5. **DMARC Record:**
   ```
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@tradersjournal.pro
   ```

## Version Control Setup

### 1. Initialize Git Repository
```bash
# Navigate to your project directory
cd Traders-Journal

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Traders Journal app"
```

### 2. Create GitHub Repository
1. Go to GitHub.com and create a new repository
2. Name it `traders-journal` or similar
3. Don't initialize with README (we already have one)
4. Copy the repository URL

### 3. Push to GitHub
```bash
# Add remote origin
git remote add origin https://github.com/yourusername/traders-journal.git

# Push to GitHub
git push -u origin main
```

## Netlify Deployment

### 1. Connect to GitHub
1. Log into Netlify
2. Click "New site from Git"
3. Choose GitHub as your Git provider
4. Authorize Netlify to access your GitHub account
5. Select your `traders-journal` repository

### 2. Configure Build Settings
```
Build command: npm run build
Publish directory: .next
Node version: 18 (or latest LTS)
```

### 3. Environment Variables
Set the following environment variables in Netlify:

#### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://oweimywvzmqoizsyotrt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_SITE_URL=https://tradersjournal.pro
```

#### Optional Variables:
```
OPENAI_API_KEY=your_openai_api_key
TURNSTILE_SITE_KEY=0x4AAAAAABm43D0IOh0X_ZLm
TURNSTILE_SECRET_KEY=0x4AAAAAABm43Hh0Kv9o9jwD5QBJ2lgLURQ
NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=your_cloudflare_analytics_token
```

### 4. Custom Domain Setup
1. In Netlify dashboard, go to "Domain settings"
2. Click "Add custom domain"
3. Enter `tradersjournal.pro`
4. Follow the DNS configuration instructions

### 5. DNS Configuration for Netlify
Add these records to your domain provider:
```
Type: A
Name: @
Value: 75.2.60.5

Type: CNAME
Name: www
Value: your-site-name.netlify.app
```

## External Services Configuration

### 1. Supabase
- **Database**: Already configured
- **Auth**: Configured for production
- **Storage**: Buckets configured
- **Edge Functions**: Deployed and configured

### 2. Resend Email Service
- **API Key**: Set in Netlify environment variables
- **Domain**: `tradersjournal.pro` (verified)
- **Email Templates**: Configured for all notification types

### 3. OpenAI (Optional)
- **API Key**: Set in Netlify environment variables
- **Usage**: AI-powered trade summaries
- **Model**: GPT-3.5-turbo

### 4. Cloudflare Turnstile (Optional)
- **Site Key**: Set in Netlify environment variables
- **Secret Key**: Set in Netlify environment variables
- **Usage**: Bot protection for forms (replaces Hcaptcha)

### 5. Cloudflare Analytics (Optional)
- **Analytics Token**: Set in Netlify environment variables
- **Usage**: Privacy-focused website analytics
- **Setup**: 
  1. **First deploy to Netlify** (analytics needs a live site)
  2. **Then** go to Cloudflare Dashboard → Analytics → Web Analytics
  3. **Add your Netlify URL** (`your-site-name.netlify.app`)
  4. **Copy the analytics token** from the provided snippet
  5. **Add token to Netlify environment variables**
  6. **Analytics will work with custom domain** once DNS is configured

## Post-Deployment Checklist

### 1. Domain Verification
- [ ] Domain `tradersjournal.pro` is accessible
- [ ] HTTPS is working correctly
- [ ] All email links point to correct domain

### 2. Email Testing
- [ ] Password reset emails work
- [ ] Friend request notifications work
- [ ] Trade sharing notifications work
- [ ] Medal achievement emails work
- [ ] Monthly/weekly/quarterly/yearly reports work

### 3. Functionality Testing
- [ ] User registration and login
- [ ] Trade management
- [ ] Social features (friends, sharing)
- [ ] Reports generation
- [ ] Admin features

### 4. Performance Monitoring
- [ ] Set up error monitoring (Sentry recommended)
- [ ] Configure analytics (Google Analytics or similar)
- [ ] Monitor Supabase usage and limits

## Security Considerations

### 1. Environment Variables
- [ ] All sensitive keys are in Netlify environment variables
- [ ] No hardcoded secrets in the codebase
- [ ] Supabase RLS policies are properly configured

### 2. Email Security
- [ ] SPF, DKIM, and DMARC records are configured
- [ ] Email addresses are properly validated
- [ ] Rate limiting is in place for email sending

### 3. Data Protection
- [ ] User data is properly encrypted
- [ ] Backup procedures are in place
- [ ] GDPR compliance measures implemented

## Maintenance

### 1. Regular Updates
- Keep dependencies updated
- Monitor for security vulnerabilities
- Update Supabase functions as needed

### 2. Backup Strategy
- Regular database backups
- Code repository backups
- Configuration backups

### 3. Monitoring
- Set up uptime monitoring
- Monitor error rates
- Track user engagement metrics

## Support and Troubleshooting

### Common Issues:
1. **Build Failures**: Check Node.js version and dependencies
2. **Email Delivery Issues**: Verify DNS records and Resend configuration
3. **Database Connection Issues**: Check Supabase credentials and network access
4. **Domain Issues**: Verify DNS propagation and SSL certificate

### Contact Information:
- **Technical Support**: Check GitHub issues
- **Email Issues**: Verify Resend dashboard
- **Domain Issues**: Contact your domain provider

## Cost Considerations

### Monthly Costs (Estimated):
- **Netlify**: Free tier (or $19/month for Pro)
- **Supabase**: Free tier (or $25/month for Pro)
- **Resend**: Free tier (or $20/month for Pro)
- **Domain**: ~$10-15/year
- **OpenAI**: Pay-per-use (optional)
- **Cloudflare Turnstile**: Free

### Scaling Considerations:
- Monitor Supabase usage limits
- Consider upgrading plans as user base grows
- Implement caching strategies for better performance

---

**Last Updated**: January 2025
**Version**: 1.0 