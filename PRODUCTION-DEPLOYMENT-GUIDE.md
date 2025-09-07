# Production Deployment Guide - NDA Playbook System

## Current Status ✅
- **MVP Complete**: All core features implemented and working
- **Development Mode**: Fully functional with comprehensive mock data
- **Database Connected**: Live Supabase connection established
- **APIs Working**: Clause data loading successfully from production database

## Production Readiness Checklist

### 🔑 Required API Keys

#### 1. Supabase Service Key
```bash
# Required for: File upload, database writes, user management
# Current: SUPABASE_SERVICE_KEY=placeholder_service_key_needed_for_production

# To obtain:
# 1. Go to: https://supabase.com/dashboard/project/mxfqoqbshcdmmmgoinvv
# 2. Navigate to: Settings → API
# 3. Copy the "service_role" key (secret)
# 4. Update .env.local:
SUPABASE_SERVICE_KEY=your_actual_service_key_here
```

#### 2. OpenAI API Key  
```bash
# Required for: AI-powered clause rewriting suggestions
# Current: OPENAI_API_KEY=placeholder_openai_key_needed_for_ai_suggestions

# To obtain:
# 1. Go to: https://platform.openai.com/api-keys
# 2. Create new API key
# 3. Update .env.local:
OPENAI_API_KEY=your_openai_key_here
```

### 🚀 Deployment Steps

#### Step 1: Update Environment Variables
```bash
# 1. Update local environment
cp .env.local .env.local.backup
nano .env.local

# 2. Update Vercel environment variables
npx vercel env add SUPABASE_SERVICE_KEY
npx vercel env add OPENAI_API_KEY
```

#### Step 2: Test Locally
```bash
# 1. Restart development server
npm run dev

# 2. Test complete workflow:
#    - Party Selection → Upload → Analysis → Results
#    - Verify no "development mode" messages in console
#    - Confirm database writes working
#    - Test AI suggestions generating
```

#### Step 3: Deploy to Production
```bash
# 1. Build and deploy
npm run build
npx vercel --prod

# 2. Test production URL
# 3. Monitor Vercel function logs
```

## Current Functionality Status

### ✅ **Working in Development Mode**
1. **Party-Aware Analysis**: 27 legal rules with perspective filtering
2. **Interactive Matrix**: 3×4 grid with clickable analysis details
3. **Text Upload System**: Paste NDA text directly (no file upload needed)
4. **Professional UI**: Kaiterra design system with legal aesthetic
5. **Auto-Navigation**: Smooth flow between sections
6. **Mock Data System**: Comprehensive testing without database dependency

### ⚠️ **Limited Without Production Keys**
1. **File Storage**: PDF/DOCX uploads work but files not permanently stored
2. **Database Writes**: Analysis results not saved (using mock data)
3. **AI Suggestions**: Template-based suggestions only (no OpenAI integration)

### 🎯 **Fully Working with Production Keys**
1. **Complete Persistence**: All data saved to Supabase database
2. **File Upload**: PDF/DOCX documents stored in secure cloud storage  
3. **AI-Powered Suggestions**: Contextual clause rewriting using GPT-4
4. **Audit Trail**: Full tracking of analysis sessions and user modifications

## Testing Scenarios

### Scenario 1: Basic Functionality (Current State)
```bash
# 1. Visit: http://localhost:3001
# 2. Select "Receiving Party" perspective
# 3. Choose "Upload & Analyse NDA" 
# 4. Use text input mode
# 5. Paste sample NDA text
# 6. Run analysis
# 7. View interactive matrix results
# Expected: Complete workflow with mock data
```

### Scenario 2: Live Database Testing (With Service Key)
```bash
# 1. Add SUPABASE_SERVICE_KEY to .env.local
# 2. Restart server: npm run dev
# 3. Repeat Scenario 1
# Expected: Results saved to database, persistent across sessions
```

### Scenario 3: AI Integration Testing (With OpenAI Key)
```bash
# 1. Add OPENAI_API_KEY to .env.local  
# 2. Test analysis with "Not Acceptable" clauses
# 3. Review AI-generated suggestions in detail panel
# Expected: Contextual, party-aware rewriting suggestions
```

## Production Monitoring

### Key Metrics to Monitor
- **Response Times**: Upload < 5s, Analysis < 10s
- **Success Rates**: >95% analysis completion
- **Error Rates**: <5% API failures
- **Database Performance**: Query times < 500ms

### Logging & Debugging
```bash
# Vercel function logs
npx vercel logs

# Local debugging
console.log statements in API routes will show in:
# - Browser Network tab (for client-side calls)
# - Terminal running npm run dev (for server-side logs)
```

## Security Considerations

### Environment Variables
- ✅ API keys stored in environment variables (not code)
- ✅ Service key only used server-side
- ✅ Client-side uses anon key with RLS protection
- ✅ No sensitive data logged to console

### Database Security
- ✅ Row Level Security (RLS) can be enabled in production
- ✅ All file uploads go to private storage bucket
- ✅ No public URLs for document access

## Support & Troubleshooting

### Common Issues

#### "Invalid Compact JWS" Error
```bash
# Cause: Placeholder Supabase service key
# Solution: Update SUPABASE_SERVICE_KEY in environment variables
```

#### Analysis Returns 404
```bash
# Cause: Development mode review ID not found in database
# Solution: Either use production keys or ensure mock data consistency
```

#### Build Failures
```bash
# Check TypeScript errors
npm run typecheck

# Check linting
npm run lint

# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

### Getting Help
- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check PLANNING.md and TASKS.md
- **Logs**: Monitor Vercel function logs for API errors

## Success Criteria

### Production Ready When:
- [ ] All API keys configured and tested
- [ ] Complete NDA analysis workflow working end-to-end
- [ ] Database persistence confirmed
- [ ] AI suggestions generating appropriate legal language
- [ ] No development mode fallbacks in production
- [ ] Response times under target thresholds
- [ ] Legal professional validation completed

---

**Next Steps**: Update environment variables and test production deployment
**Timeline**: Can be production-ready within 30 minutes of obtaining API keys
**Status**: MVP complete, awaiting API key configuration for full production capability