# Google OAuth Setup Guide

Enable simple login & signup with Google for Pokhara Invoice.

## 🔐 Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a Project" → "New Project"
3. Name: `Pokhara Invoice`
4. Click "Create"
5. Wait 1-2 minutes for project creation

---

## 🔑 Step 2: Create OAuth 2.0 Credentials

1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. If prompted, configure OAuth consent screen first:
   - User Type: **External** (for testing)
   - Click **Create**
   - Fill in:
     - App name: `Pokhara Invoice`
     - User support email: Your email
     - Developer contact: Your email
   - Click **Save and Continue**
   - Add scopes: Search for `userinfo.profile` and `userinfo.email` → Add both
   - Click **Save and Continue**
   - Review and go back to create credentials

4. Now create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: `Pokhara Invoice Web`
   - Authorized redirect URIs: Add these:
     - `http://localhost:3000/auth/google/callback` (development)
     - `http://192.168.1.171:3000/auth/google/callback` (local network)
   - Click **Create**

5. Copy the credentials:
   - **Client ID** → `GOOGLE_CLIENT_ID` in `.env`
   - **Client Secret** → `GOOGLE_CLIENT_SECRET` in `.env`

---

## 📝 Step 3: Update Your .env File

```bash
# .env
GOOGLE_CLIENT_ID=123456789-abcdefghijk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

---

## 🚀 Step 4: Start the Server

```bash
npm start
```

Visit: http://localhost:3000/auth/login

You should see:
- **Login with Google** button
- **Sign up with Google** button

---

## ✅ Step 5: Test Google Login

1. Click "Login with Google"
2. Sign in with your Google account
3. Accept permissions
4. You'll be automatically logged in & redirected to dashboard

**First time?** A new business account is auto-created with your Google email.

---

## 🌍 Step 6: Production Deployment

### For Railway.app:

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth Client ID
3. Add redirect URI:
   ```
   https://your-railway-app-name.up.railway.app/auth/google/callback
   ```

4. In Railway Dashboard, add variables:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=https://your-railway-app-name.up.railway.app/auth/google/callback
   ```

### For Heroku:

```bash
heroku config:set GOOGLE_CLIENT_ID="your-client-id"
heroku config:set GOOGLE_CLIENT_SECRET="your-client-secret"
heroku config:set GOOGLE_CALLBACK_URL="https://your-app-name.herokuapp.com/auth/google/callback"
```

---

## 🆘 Troubleshooting

### "Redirect URI mismatch" Error

**Solution:** Make sure redirect URI in Google Console **exactly matches** the callback URL in `.env`

| Environment | Callback URL |
|------------|------------|
| Local | `http://localhost:3000/auth/google/callback` |
| Network | `http://192.168.1.171:3000/auth/google/callback` |
| Railway | `https://your-app.up.railway.app/auth/google/callback` |
| Heroku | `https://your-app.herokuapp.com/auth/google/callback` |

### Google Button Not Showing

- Check if `GOOGLE_CLIENT_ID` is set in `.env`
- Restart the server: `npm start`
- Clear browser cache

### "Invalid Client" Error

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Make sure OAuth Consent Screen is configured
- Credentials should be "External" app type

### User Not Created After Login

- Check MongoDB connection in logs
- Verify user email isn't already registered
- Check `.env` `MONGODB_URL` is correct

---

## 📱 What Happens When User Logs In with Google

1. User clicks "Login with Google"
2. Redirected to Google login
3. User signs in with Google account
4. Google redirects back with user profile
5. App checks if user exists:
   - **Yes** → Login user with existing account
   - **No** → Create new business account from Google profile
6. Session created & user redirected to dashboard

---

## 🔒 Security Notes

- OAuth credentials are **NOT** stored in database
- User passwords **NOT** required for Google login
- Sessions use secure cookies with httpOnly flag
- Google handles authentication securely
- No password reset needed for Google users

---

## 🎉 Done!

Your app now supports:
- ✅ Email/Password login
- ✅ Google login
- ✅ Google signup
- ✅ Auto account creation

Enjoy simplified authentication! 🚀
