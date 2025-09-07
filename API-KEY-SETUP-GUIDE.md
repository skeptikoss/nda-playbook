# API Key Setup Guide - Production Deployment

## Overview
To enable full production functionality, you need two API keys:
1. **Supabase Service Key** - For database writes and file storage
2. **OpenAI API Key** - For AI-powered legal suggestions

## 🔑 Step 1: Get Supabase Service Key

### Instructions:
1. **Visit**: https://supabase.com/dashboard/sign-in
2. **Sign in** with your Supabase account credentials
3. **Select project**: "NDA Review Playbook" (mxfqoqbshcdmmmgoinvv)
4. **Navigate to**: Settings → API (left sidebar)
5. **Find the section**: "Project API keys"
6. **Copy**: The `service_role` key (marked as "secret" - this is NOT the anon key)

### What it looks like:
```
Project API keys
┌─────────────────────────────────────────────────────────────────┐
│ anon/public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...          │
│ service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (secret) │  ← COPY THIS ONE
└─────────────────────────────────────────────────────────────────┘
```

## 🤖 Step 2: Get OpenAI API Key

### Instructions:
1. **Visit**: https://platform.openai.com/api-keys
2. **Sign in** with your OpenAI account (create one if needed)
3. **Click**: "Create new secret key"
4. **Name it**: "NDA Playbook Production"
5. **Copy the key immediately** (you won't see it again!)

### Notes:
- **Free Tier**: $5 free credit for new accounts
- **Usage Estimate**: ~$0.01-0.05 per NDA analysis
- **Monthly Limit**: Set spending limits in OpenAI dashboard

## 🔧 Step 3: Update Environment Variables

Once you have both keys, run these commands:

### Local Development:
```bash
# Navigate to your project
cd /Users/alvinkoh/claude-projects/nda-playbook

# Create backup of current env file
cp .env.local .env.local.backup

# Edit the environment file
nano .env.local
```

### Update these lines in .env.local:
```bash
# Replace this line:
SUPABASE_SERVICE_KEY=placeholder_service_key_needed_for_production

# With your actual key:
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_SERVICE_KEY_HERE

# Replace this line:
OPENAI_API_KEY=placeholder_openai_key_needed_for_ai_suggestions

# With your actual key:
OPENAI_API_KEY=sk-YOUR_ACTUAL_OPENAI_KEY_HERE
```

### Vercel Production Environment:
```bash
# Add keys to Vercel (for production deployment)
npx vercel env add SUPABASE_SERVICE_KEY
# Paste your Supabase service key when prompted

npx vercel env add OPENAI_API_KEY  
# Paste your OpenAI key when prompted
```

## 🧪 Step 4: Test the Setup

### Restart Development Server:
```bash
# Stop current server (Ctrl+C)
# Restart with new keys
npm run dev
```

### Test Checklist:
- [ ] Visit http://localhost:3001
- [ ] Upload a test NDA (should see "Production mode" in console, not "Development mode")
- [ ] Verify analysis results are saved to database
- [ ] Check AI suggestions are generated (not template fallbacks)
- [ ] No "placeholder API key" errors in console

## 🚀 Step 5: Deploy to Production

### Build and Deploy:
```bash
# Test production build locally
npm run build

# Deploy to Vercel with new environment variables
npx vercel --prod
```

### Production Validation:
- [ ] Visit your production URL
- [ ] Test complete NDA analysis workflow
- [ ] Verify database operations working
- [ ] Check Vercel function logs for any errors

## 🔍 Troubleshooting

### Common Issues:

#### "Invalid Compact JWS" Error
- **Cause**: Wrong or malformed Supabase service key
- **Solution**: Double-check you copied the `service_role` key (not anon key)

#### OpenAI API Errors
- **Cause**: Invalid API key or no credit balance
- **Solution**: Verify key format starts with `sk-` and check OpenAI dashboard for usage

#### Environment Variables Not Loading
- **Cause**: Syntax errors in .env.local
- **Solution**: Ensure no spaces around `=` and no quotes around values

#### Build Failures
```bash
# Clean build
rm -rf .next
npm run build
```

## 📊 Expected Results After Setup

### Console Logs Should Show:
```
✓ Database connected successfully
✓ Processing NDA with production analysis engine  
✓ OpenAI API responding with contextual suggestions
✓ Analysis results saved to database
```

### No More Messages About:
- "Development mode detected"
- "Using mock data"
- "Placeholder API keys"

## 💡 Next Steps After Setup

Once both keys are working:
1. **Legal Professional Review** - Validate rule accuracy
2. **Real NDA Testing** - Test with actual legal documents  
3. **Client Demonstrations** - Schedule law firm demos
4. **Performance Monitoring** - Track response times and accuracy

---

**When you have both API keys, let me know and I'll help you update the configuration and test everything!**