# Going to Production - What You Actually Need

**⚠️ READ THIS BEFORE changing `NODE_ENV=production` in your .env file!**

Remember all those token errors and 403 issues we fixed during development? **They'll ALL come back if you switch to production without HTTPS!**

---

## 🚨 The One Thing You ABSOLUTELY Need: HTTPS

**Bottom line:** Production mode WILL NOT WORK without HTTPS. Period.

### Why?

When you set `NODE_ENV=production`, the app turns on strict security:
- Forces all traffic to use HTTPS (that's the `https://` in the URL)
- Makes cookies only work over HTTPS
- Blocks any plain HTTP requests

### What Happens If You Try Production Without HTTPS?

**You'll see the exact same errors we spent time fixing:**
- ❌ Forms don't submit (403 Forbidden)
- ❌ CSRF token errors everywhere
- ❌ Cookies don't work
- ❌ App loads but nothing actually works
- ❌ You'll be super frustrated 😤

**It's like trying to use your car's security system without the key fob - the car is there, but you can't use it.**

---

## What You Actually Need Before Going Live

### The Must-Haves:

**1. A Domain Name**
   - Like `myawesomeapp.com`
   - Buy from Namecheap, GoDaddy, Google Domains, etc.
   - Cost: ~$10-15/year

**2. HTTPS/SSL Certificate**
   - This is what makes `https://` work
   - **FREE options:** Cloudflare or Let's Encrypt
   - Paid options: ~$50-100/year (not needed, use free!)

**3. A Server**
   - Where your app actually runs
   - Options: DigitalOcean, AWS, Heroku, Vercel, etc.
   - Cost: $5-20/month for basic server

**4. Different Secrets for Production**
   - Generate TWO new random secrets (don't reuse your dev ones!)
   - Run this command twice:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - First output = `SESSION_SECRET`
   - Second output = `CSRF_SECRET`

---

## Before You Touch NODE_ENV

**DO NOT change `NODE_ENV=production` until you have:**

- [ ] HTTPS set up and working
- [ ] Your domain pointing to your server
- [ ] New production secrets generated
- [ ] `.env` file on server with production values
- [ ] Tested that HTTPS works (visit `https://yourdomain.com`)

**If you change NODE_ENV without HTTPS, your app will break!**

---

## How to Get HTTPS (Pick One)

### 🌟 Option 1: Cloudflare (Recommended for Beginners!)

**Why this is easiest:**
- Completely free
- Takes 15 minutes
- No server configuration needed
- You just update some settings and it works

**How it works:**
1. Go to [cloudflare.com](https://cloudflare.com) and sign up (free account)
2. Add your domain (like `myapp.com`)
3. Cloudflare gives you two nameservers (like `ns1.cloudflare.com`)
4. Go to your domain registrar (where you bought the domain)
5. Update the nameservers to Cloudflare's nameservers
6. Wait 5-10 minutes for it to activate
7. In Cloudflare dashboard:
   - Click "SSL/TLS" → Set to "Full"
   - Click "SSL/TLS" → "Edge Certificates" → Turn on "Always Use HTTPS"
8. Done! Your app now has HTTPS 🎉

**The cool part:**
- Your app still runs plain HTTP on your server
- Cloudflare converts it to HTTPS for users
- You don't need to configure anything on your server
- Free SSL certificate that auto-renews forever

---

### 🔧 Option 2: Let's Encrypt (If You Want Full Control)

**For when you want to manage everything yourself.**

**You'll need:**
- A Linux server (Ubuntu, Debian, etc.)
- Basic command line knowledge
- About 30 minutes

**Quick version:**
```bash
# Install nginx and certbot
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# Get SSL certificate (replace yourdomain.com)
sudo certbot --nginx -d yourdomain.com

# Follow the prompts, it'll configure everything
# Certificate auto-renews every 90 days automatically
```

**That's literally it.** Certbot does all the hard work for you.

---

### 💰 Option 3: Buy an SSL Certificate

**Don't do this.** Seriously, use Option 1 or 2. They're free and better.

(But if your company requires it for some reason, buy from your domain registrar and follow their install guide)

---

## Keeping Your App Running (PM2)

**The problem:** If you just run `npm start` on your server and close the terminal, your app stops.

**The solution:** PM2 - it keeps your app running forever, restarts it if it crashes, and manages logs.

### Install PM2
```bash
npm install -g pm2
```

### Start Your App
```bash
cd /path/to/todo-app
pm2 start bin/www --name "todo-app"
pm2 startup    # Makes it auto-start when server reboots
pm2 save       # Saves the current setup
```

### Useful Commands
```bash
pm2 status              # Is my app running?
pm2 logs todo-app       # Show me what's happening
pm2 restart todo-app    # Restart the app
pm2 stop todo-app       # Stop the app
```

**That's all you need to know about PM2!**

---

## Can I Test Production Mode Without Deploying?

**Short answer:** Not really, and you probably shouldn't try.

**Why?** Production mode requires real HTTPS, which requires:
- A domain name
- An SSL certificate
- Proper server setup

**What you CAN do:** Test with development mode, then deploy to production when ready.

**Trust me,** trying to set up fake SSL certificates locally is more hassle than it's worth. Just keep `NODE_ENV=development` on your laptop and use `NODE_ENV=production` only on your real server.

---

## When Things Go Wrong (Troubleshooting)

### "Forms don't work! Getting 403 errors again!"

**This is the most common issue.** Here's what to check:

1. **Are you actually using HTTPS?**
   - Look at your URL bar - does it say `https://` or just `http://`?
   - If it's `http://`, that's your problem!
   - Fix: Set up HTTPS (see options above)

2. **Are cookies being set?**
   - Open browser DevTools (F12)
   - Go to Application tab → Cookies
   - Look for `session-id` and `x-csrf-token`
   - If they're not there, HTTPS isn't working

3. **Did you hard refresh?**
   - Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - This clears cached JavaScript

4. **Check server logs:**
   ```bash
   pm2 logs todo-app
   ```
   - Look for errors about CSRF or cookies

---

### "Getting SSL/HTTPS errors"

**Two common causes:**

1. **SSL certificate isn't set up correctly**
   - If using Cloudflare: Make sure SSL mode is "Full" not "Flexible"
   - If using Let's Encrypt: Run `sudo certbot renew --dry-run` to test

2. **Browser has old HTTPS settings cached**
   - Chrome: Go to `chrome://net-internals/#hsts`
   - Type your domain and click "Delete"
   - Restart browser

---

### "Too many requests" message

**This means rate limiting is working!** In production:
- Max 100 requests per 15 minutes (general)
- Max 20 form submissions per 15 minutes

**If this is annoying during testing:**
- Wait 15 minutes, or
- Temporarily increase limits in `app.js` line 58 and 68
- Change `100` to `500` and `20` to `100`
- Remember to change back for real production!

---

### "App crashes when I start it"

**Check these in order:**

1. **Is `.env` file there?**
   ```bash
   ls -la .env
   ```
   If not, create it!

2. **Are secrets set in .env?**
   ```bash
   cat .env
   ```
   Make sure `SESSION_SECRET` and `CSRF_SECRET` have values

3. **Any typos in .env?**
   ```bash
   # Good:
   NODE_ENV=production

   # Bad (spaces around =):
   NODE_ENV = production
   ```

4. **View the actual error:**
   ```bash
   pm2 logs todo-app --lines 50
   ```

---

### "Database errors"

**Quick fixes:**

```bash
# Make sure data folder exists
mkdir -p /path/to/todo-app/data

# Fix permissions
chmod 755 /path/to/todo-app/data

# Check disk space
df -h
```

**Still broken?** Delete the database and let it recreate:
```bash
rm data/database.db
pm2 restart todo-app
```

---

## Testing Checklist Before Going Live

### Before You Switch NODE_ENV to Production:

- [ ] HTTPS is working (visit `https://yourdomain.com` - you should see a padlock)
- [ ] Domain points to your server
- [ ] PM2 is installed and app runs
- [ ] New production secrets generated and in `.env`
- [ ] `.env` file is NOT committed to git

### After You Switch to Production:

- [ ] Visit `https://yourdomain.com` (note the `https://`)
- [ ] Homepage loads
- [ ] Can add a notice
- [ ] Can add a shopping item
- [ ] Can delete a shopping item
- [ ] No errors in browser console (F12)
- [ ] Server logs look good: `pm2 logs todo-app`

**If ANY of these fail, switch back to development mode immediately!**

---

## Step-by-Step Deployment (The Actual Process)

### 1. Get Your Server Ready

```bash
# SSH into your server
ssh user@your-server-ip

# Update everything
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version
npm --version
```

### 2. Get Your Code on the Server

```bash
# Clone your repo
git clone https://github.com/yourusername/todo-app.git
cd todo-app

# Install dependencies
npm install --production
```

### 3. Set Up Environment

```bash
# Copy the example
cp .env.example .env

# Generate secrets (run this twice!)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edit .env
nano .env
```

**Your .env should look like:**
```bash
PORT=3000
NODE_ENV=production
SESSION_SECRET=<first-random-string-you-generated>
CSRF_SECRET=<second-random-string-you-generated>
```

Press Ctrl+X, then Y, then Enter to save.

### 4. Set Up HTTPS (Choose One)

**Option A: Cloudflare (Easiest)**
- Follow the Cloudflare setup in the "How to Get HTTPS" section above
- Skip to step 5

**Option B: Let's Encrypt**
```bash
# Install nginx and certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Follow the prompts (choose redirect HTTP to HTTPS when asked)
```

### 5. Start Your App with PM2

```bash
# Install PM2
npm install -g pm2

# Start the app
pm2 start bin/www --name "todo-app"

# Make it auto-start on reboot
pm2 startup
# Copy and run the command it gives you

# Save PM2 config
pm2 save
```

### 6. Test Everything!

1. Open `https://yourdomain.com` in your browser
2. Try adding a notice
3. Try adding a shopping item
4. Try deleting something
5. Open DevTools (F12) and check for errors

**If everything works: 🎉 You're live!**

**If something's broken:** Check the troubleshooting section above.

---

## Daily Maintenance (Super Quick)

**Check if app is running:**
```bash
pm2 status
```

**View recent logs:**
```bash
pm2 logs todo-app --lines 50
```

**Restart app after code changes:**
```bash
cd todo-app
git pull
npm install --production
pm2 restart todo-app
```

**That's it!** PM2 handles everything else automatically.

---

## Emergency: Switch Back to Development

**If production is broken and you need to quickly revert:**

```bash
# Edit .env
nano .env

# Change this line:
NODE_ENV=development

# Save and restart
pm2 restart todo-app
```

**Now access via:** `http://your-server-ip:3000`

**This is temporary!** You still need to fix HTTPS for real production use.

---

## TL;DR - The Absolute Essentials

**Don't change `NODE_ENV=production` until you have:**

1. ✅ **HTTPS working** (via Cloudflare or Let's Encrypt)
2. ✅ **New production secrets** (not the same as development!)
3. ✅ **Domain name** pointing to your server
4. ✅ **PM2 installed** and running your app

**Without HTTPS, you'll get the same 403 and CSRF errors we fixed in development!**

---

## The Easiest Path (For Real Beginners)

1. **Buy domain:** ~$10/year from Namecheap
2. **Get server:** DigitalOcean Droplet ($6/month) or similar
3. **Use Cloudflare:** Free HTTPS, takes 15 minutes to set up
4. **Install PM2:** Keeps your app running
5. **Change NODE_ENV:** Only after HTTPS works!

**Total cost:** ~$15/year + $6/month
**Time needed:** 1-2 hours for first deployment

---

## Still Confused?

**Remember:**
- Development mode = Your laptop, no HTTPS needed, relaxed security
- Production mode = Live server, HTTPS REQUIRED, strict security

**The app is the same code**, just different settings based on NODE_ENV.

**Questions?** Check `ENVIRONMENTS_GUIDE.md` for more details on how DEV vs PROD works.
