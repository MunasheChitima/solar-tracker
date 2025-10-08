# GitHub Secrets Setup Guide

## 🔧 Fix GitHub Actions Deployment

The GitHub Actions workflow is failing because it needs Vercel authentication tokens. Here's how to set them up:

## 📋 Required Secrets

You need to add these secrets to your GitHub repository:

1. **VERCEL_TOKEN** - Your Vercel API token
2. **VERCEL_ORG_ID** - Your Vercel organization ID  
3. **VERCEL_PROJECT_ID** - Your Vercel project ID

## 🚀 Step-by-Step Setup

### Step 1: Get Vercel Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Name it "GitHub Actions Solar Tracker"
4. Set expiration to "No Expiration" (or your preferred duration)
5. Copy the generated token

### Step 2: Get Organization and Project IDs

From the terminal output, I can see:
- **VERCEL_ORG_ID**: `munashes-projects-2611c01c`
- **VERCEL_PROJECT_ID**: `prj_fTeT0vPCvHGfDNDG6nblrIHKC21C`

### Step 3: Add Secrets to GitHub

1. Go to your repository: https://github.com/MunasheChitima/solar-tracker
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret** for each secret:

#### Secret 1: VERCEL_TOKEN
- **Name**: `VERCEL_TOKEN`
- **Value**: [Your Vercel API token from Step 1]

#### Secret 2: VERCEL_ORG_ID
- **Name**: `VERCEL_ORG_ID`
- **Value**: `munashes-projects-2611c01c`

#### Secret 3: VERCEL_PROJECT_ID
- **Name**: `VERCEL_PROJECT_ID`
- **Value**: `prj_fTeT0vPCvHGfDNDG6nblrIHKC21C`

## 🔄 Alternative: Disable GitHub Actions (Temporary)

If you prefer to deploy manually for now, you can disable the GitHub Actions:

1. Go to your repository settings
2. Click **Actions** → **General**
3. Under "Actions permissions", select "Disable Actions"

## ✅ Test the Setup

After adding the secrets:

1. Make a small change to any file
2. Commit and push to main branch
3. Check the **Actions** tab in your GitHub repository
4. The deployment should now succeed

## 🛠️ Manual Deployment (Backup Option)

If GitHub Actions continues to have issues, you can always deploy manually:

```bash
# In your project directory
vercel --prod
```

## 📞 Troubleshooting

### Common Issues:
- **"Input required and not supplied: vercel-token"** → VERCEL_TOKEN secret not set
- **"Project not found"** → VERCEL_PROJECT_ID is incorrect
- **"Organization not found"** → VERCEL_ORG_ID is incorrect

### Verify Secrets:
- Go to repository Settings → Secrets and variables → Actions
- Ensure all three secrets are listed and have values

---

Once you've added these secrets, your GitHub Actions will automatically deploy to Vercel on every push to the main branch! 🎉
