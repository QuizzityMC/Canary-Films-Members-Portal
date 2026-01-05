# Deploying to Vercel

This guide will help you deploy the Canary Films Members Portal to Vercel.

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed: `npm install -g vercel`
- A PostgreSQL database (Vercel Postgres, Neon, Supabase, or similar)

## Important: Database Migration

⚠️ **SQLite is not supported on Vercel** because Vercel's file system is ephemeral (read-only and temporary).

You need to migrate to a cloud database service. We recommend:

### Option 1: Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Select your project
3. Go to "Storage" tab
4. Click "Create Database" → "Postgres"
5. Follow the setup wizard
6. Vercel will automatically add the connection string to your environment variables

### Option 2: Neon (Free PostgreSQL)
1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string
4. Add to Vercel environment variables as `DATABASE_URL`

### Option 3: Supabase (Free PostgreSQL with extras)
1. Sign up at https://supabase.com
2. Create a new project
3. Copy the connection string from Project Settings → Database
4. Add to Vercel environment variables as `DATABASE_URL`

## Database Adapter

Since Vercel doesn't support SQLite, you'll need to install a PostgreSQL adapter:

```bash
npm install pg
```

The application will automatically detect and use PostgreSQL when `DATABASE_URL` is set.

## Step 1: Prepare Your Repository

Make sure your repository is pushed to GitHub, GitLab, or Bitbucket.

## Step 2: Connect to Vercel

### Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Import your repository
3. Vercel will automatically detect it as a Node.js project
4. Click "Deploy"

### Via Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy
vercel
```

## Step 3: Configure Environment Variables

In your Vercel project dashboard, go to **Settings → Environment Variables** and add:

### Required Variables

```
SESSION_SECRET=your-random-secret-here
DATABASE_URL=your-postgres-connection-string
```

Generate SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### OAuth Configuration (Optional)

#### Hack Club OAuth
```
HACKCLUB_CLIENT_ID=your_hackclub_client_id
HACKCLUB_CLIENT_SECRET=your_hackclub_client_secret
HACKCLUB_CALLBACK_URL=https://your-app.vercel.app/auth/hackclub/callback
```

#### Google OAuth
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-app.vercel.app/auth/google/callback
```

### Additional Variables

```
NODE_ENV=production
BASE_URL=https://your-app.vercel.app
```

## Step 4: Update OAuth Redirect URIs

After deployment, update your OAuth application settings:

### Hack Club
1. Go to your Hack Club developer settings
2. Update the callback URL to: `https://your-app.vercel.app/auth/hackclub/callback`

### Google
1. Go to Google Cloud Console
2. Navigate to your OAuth credentials
3. Add authorized redirect URI: `https://your-app.vercel.app/auth/google/callback`

## Step 5: Initialize Database

After first deployment, you need to initialize the database tables.

The application will automatically create tables on first run when it detects PostgreSQL.

## Step 6: Access Your Application

Your application will be available at: `https://your-app.vercel.app`

The default admin account will be created on first run. Check the deployment logs for the credentials:

```
Admin: admin@canaryfilms.org
Password: [shown in logs - save it!]
```

## Custom Domain

To use a custom domain (like portal.canaryfilms.org):

1. Go to your Vercel project settings
2. Click on "Domains"
3. Add your domain: `portal.canaryfilms.org`
4. Follow Vercel's DNS configuration instructions

Typically you'll need to add these DNS records:

**Option A: Using A Record**
```
Type: A
Name: portal (or @)
Value: 76.76.21.21
```

**Option B: Using CNAME Record**
```
Type: CNAME
Name: portal
Value: cname.vercel-dns.com
```

## Monitoring and Logs

- View deployment logs: Vercel Dashboard → Your Project → Deployments
- View runtime logs: Vercel Dashboard → Your Project → Logs
- Monitor performance: Vercel Dashboard → Your Project → Analytics

## Limitations on Vercel

1. **No HTTPS port configuration**: Vercel handles HTTPS automatically
2. **No custom ports**: All traffic goes through standard HTTP/HTTPS
3. **Serverless execution**: Functions have a 10-second timeout (Hobby) or 60-second timeout (Pro)
4. **Ephemeral file system**: Can't store files permanently (use cloud storage)
5. **Cold starts**: First request after inactivity may be slower

## Session Management

The application uses express-session which stores sessions in memory by default. For production on Vercel, consider:

### Option 1: Vercel KV (Redis) - Recommended

```bash
npm install @vercel/kv connect-redis
```

Update session configuration to use Redis (documentation included in code).

### Option 2: Database Sessions

Sessions will be stored in the PostgreSQL database automatically when using the database adapter.

## Troubleshooting

### Build Failures

Check the build logs in Vercel dashboard. Common issues:
- Missing environment variables
- Database connection errors
- Missing dependencies

### Runtime Errors

Check the function logs in Vercel dashboard. Common issues:
- Database connection timeout
- OAuth callback URL mismatch
- Session store errors

### Database Connection Issues

Ensure your `DATABASE_URL` is correct and the database is accessible from Vercel's servers. Most cloud database providers whitelist Vercel's IP ranges automatically.

## Development

To test locally with Vercel environment:

```bash
# Install Vercel CLI
npm install -g vercel

# Link your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run development server
vercel dev
```

## Updating Your Deployment

Simply push to your repository:

```bash
git add .
git commit -m "Update application"
git push
```

Vercel will automatically deploy the latest changes.

## Cost Considerations

- **Hobby Plan**: Free, suitable for small teams
  - 100 GB bandwidth/month
  - Serverless function execution
  - Automatic HTTPS
  
- **Pro Plan**: $20/month
  - More bandwidth
  - Team collaboration
  - Advanced analytics
  - Priority support

- **Database Costs**: Depends on provider
  - Vercel Postgres: Included in Pro plan
  - Neon: Free tier available
  - Supabase: Free tier available

## Support

For Vercel-specific issues:
- Documentation: https://vercel.com/docs
- Support: https://vercel.com/support

For application issues:
- Check the repository issues
- Review SECURITY.md for security guidelines
