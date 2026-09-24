# HackML 2026 Portal - Deployment Guide

## Prerequisites
- A Vercel account (free tier works perfectly)
- Your Supabase integration is already connected in v0
- A custom domain (optional - can be purchased or use SFU's domain)

## Step 1: Deploy to Vercel

### Option A: One-Click Deployment from v0
1. Click the **"Publish"** button in the top right of your v0 project
2. Follow the prompts to connect your Vercel account
3. v0 will automatically deploy your app and set up all environment variables
4. Your app will be live at `https://your-project-name.vercel.app`

### Option B: Deploy from GitHub
1. Download your project from v0 (three dots menu → Download ZIP)
2. Push the code to a GitHub repository
3. Go to [vercel.com](https://vercel.com) and sign in
4. Click "Add New Project"
5. Import your GitHub repository
6. Vercel will auto-detect Next.js settings
7. Add environment variables (see below)
8. Click "Deploy"

## Step 2: Environment Variables

Your Supabase environment variables are already set up through the v0 integration. If deploying manually, ensure these are added in Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
POSTGRES_URL=your_postgres_url
POSTGRES_PRISMA_URL=your_postgres_prisma_url
POSTGRES_URL_NON_POOLING=your_postgres_url_non_pooling
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DATABASE=your_postgres_database
POSTGRES_HOST=your_postgres_host
SUPABASE_JWT_SECRET=your_jwt_secret
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Optional for email confirmation redirects during local development:
```
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/dashboard
```

## Step 3: Run Database Scripts

The database tables need to be created. In v0, you can run the SQL script directly:

1. The `scripts/001_create_tables.sql` file will be automatically detected
2. Click the "Run Script" button in v0's interface
3. This creates all tables, RLS policies, and the team code generator function

## Step 4: Connect Custom Domain

### For a Purchased Domain (e.g., portal.sfudsss.com)

1. **In Vercel Dashboard:**
   - Go to your project settings
   - Click on "Domains"
   - Click "Add Domain"
   - Enter your domain: `portal.sfudsss.com`
   - Click "Add"

2. **In Your Domain Registrar (Namecheap, GoDaddy, etc.):**
   - Go to DNS settings
   - Add a CNAME record:
     ```
     Type: CNAME
     Name: portal (or @ for root domain)
     Value: cname.vercel-dns.com
     TTL: 3600 (or Auto)
     ```
   - Save changes

3. **Verification:**
   - Go back to Vercel
   - Wait for DNS propagation (can take up to 48 hours, usually < 1 hour)
   - Vercel will automatically provision an SSL certificate
   - Your site will be live at `https://portal.sfudsss.com`

### For SFU Domain (sfudsss.com or www.sfu.ca/science/web/dsss/)

**Option 1: Use a Subdomain**
1. Contact SFU IT or your faculty's web admin
2. Request a CNAME record for your subdomain:
   ```
   portal.sfudsss.com → cname.vercel-dns.com
   ```
3. Once approved, add the domain in Vercel as described above

**Option 2: Subdirectory Approach**
If SFU requires hosting under their domain structure:
1. Keep your portal at `your-project.vercel.app`
2. Have SFU IT set up a reverse proxy from `www.sfu.ca/science/web/dsss/portal` to your Vercel URL
3. This requires SFU IT assistance but maintains the university domain

**Option 3: Simple Link**
- Deploy to Vercel with default URL
- Link to it from the main SFU DSSS website
- Example: Add a "Register for HackML" button that goes to `hackml-portal.vercel.app`

## Step 5: Configure Supabase for Production

1. **Update Email Templates (Optional):**
   - Go to Supabase Dashboard → Authentication → Email Templates
   - Customize the verification email with your branding

2. **Configure Redirect URLs:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your production URL to "Site URL": `https://portal.sfudsss.com`
   - Add redirect URLs:
     - `https://portal.sfudsss.com/dashboard`
     - `https://portal.sfudsss.com/**` (wildcard for all routes)

## Step 6: Test Everything

1. Visit your deployed site
2. Create a test account
3. Verify email confirmation works
4. Complete participant registration
5. Create a test team
6. Test joining a team with the code
7. Verify all data is saving correctly

## Recommended Domain Structure

For a professional setup with multiple events:

```
sfudsss.com                           → Main DSSS homepage
sfudsss.com/events                    → Events listing page
sfudsss.com/events/hackml-2026        → Event landing page (static)
portal.sfudsss.com                    → Registration portal (this app)
portal.sfudsss.com/dashboard          → User dashboard
```

## Troubleshooting

### Email Verification Not Working
- Check Supabase email settings
- Verify redirect URLs are correct
- Check spam folder

### Database Connection Issues
- Verify all Supabase environment variables in Vercel
- Check RLS policies are enabled
- Ensure database scripts ran successfully

### Domain Not Working
- Wait for DNS propagation (can take 48 hours)
- Verify CNAME record is correct
- Check Vercel domain status

### Users Can't Register
- Verify Supabase project is not paused (free tier pauses after inactivity)
- Check database tables exist
- Review Vercel deployment logs

## Security Checklist

- [ ] Row Level Security (RLS) is enabled on all tables
- [ ] Email verification is required for new accounts
- [ ] HTTPS is enabled (automatic with Vercel)
- [ ] Environment variables are properly set
- [ ] Database connection uses connection pooling

## Maintenance

- **Monitor Usage:** Check Supabase dashboard for user count and database size
- **Backups:** Supabase automatically backs up your database
- **Updates:** Redeploy when you make changes in v0 using the "Publish" button

## Cost Breakdown (Free Tier Limits)

**Vercel Free Tier:**
- 100GB bandwidth/month
- Unlimited deployments
- Automatic HTTPS
- More than enough for a hackathon event

**Supabase Free Tier:**
- 500MB database
- 50,000 monthly active users
- 2GB file storage
- Perfect for HackML 2026

**Custom Domain:**
- .com domain: ~$12/year
- .ca domain: ~$15/year
- SFU subdomain: Free (if available)

## Need Help?

- Vercel Documentation: https://vercel.com/docs
- Supabase Documentation: https://supabase.com/docs
- Next.js Documentation: https://nextjs.org/docs

Your portal is production-ready! Good luck with HackML 2026! 🚀
