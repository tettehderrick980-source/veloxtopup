# [DEFUNCT] Migration Guide: Node.js API (REVERTED)

> **IMPORTANT:** The `veloxtopup-api` (Express/Node.js) backend has been removed. 
> This project strictly uses **Supabase Edge Functions**.

## Current Architecture
The app communicates directly with Supabase via the client SDK and invokes logic via **Edge Functions**.

### Key Files
- `src/services/api.js`: The central service for invoking functions.
- `supabase/functions/`: Contains the Deno-based edge function code.

### Action Required
1. **Delete** the `veloxtopup-api/` directory from your local machine.
2. Ensure no environment variables in Vercel point to `VITE_API_URL`.
3. Deploy all functions using:
   ```bash
   supabase functions deploy
   ```

## Next Steps

1. **Test the backend thoroughly**:
   - Run `npm run dev` in the backend
   - Test each endpoint using the API documentation at `/api`
   - Verify Supabase connection works
   - Test GhDataConnect and Paystack integrations

2. **Update remaining frontend components**:
   - Update TransactionsPage to use `transactionAPI`
   - Update DashboardPage to use `userAPI` and `adminAPI`
   - Update AdminDashboard to use `adminAPI`

3. **Deploy the backend**:
   - Choose a hosting platform (Vercel, Railway, Render, etc.)
   - Set environment variables
   - Update frontend VITE_API_URL to point to production

4. **Monitor and maintain**:
   - Check logs in `veloxtopup-api/logs/`
   - Monitor webhook events
   - Set up error tracking (optional)

## Rollback Plan

If issues arise:
1. Keep Supabase Edge Functions running during transition
2. Frontend can fall back to Edge Functions by changing API calls
3. Database remains unchanged (still Supabase)

## Benefits of New Architecture

✅ **Better debugging** - Full Node.js debugging tools  
✅ **More control** - Complete control over business logic  
✅ **Better error handling** - Comprehensive error middleware  
✅ **Professional logging** - Winston logger with structured logs  
✅ **Easier testing** - Can write unit tests for API endpoints  
✅ **Scalability** - Can add caching, queuing, rate limiting  
✅ **Familiar stack** - Express.js is industry standard  

## Support

If you encounter issues:
1. Check backend logs in `veloxtopup-api/logs/`
2. Verify environment variables are set correctly
3. Test Supabase connection independently
4. Check API health endpoint: `GET /health`

## Summary

You've successfully migrated from Supabase Edge Functions to a professional Node.js/Express backend. The new architecture gives you:
- Full control over your API
- Better debugging and logging
- Industry-standard Express.js framework
- Easier testing and maintenance
- Scalable architecture for future growth

The Supabase database and authentication remain unchanged - you're just replacing the Edge Functions with a more robust backend solution.
