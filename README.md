# Pokhara Invoice 📄

Online invoice billing system for businesses in Pokhara, Nepal.

## Features

✅ **User dashboard** — full invoice system per business
✅ **Admin dashboard** — list registered companies, toggle active/inactive
✅ **Customers** — full CRUD with search, Nepali names, invoice history
✅ **Products / inventory** — stock tracking, categories, low-stock alerts, VAT flag
✅ **Invoices** — VAT (13% default), discounts, partial payments, statuses
✅ **PDF & print** — A4 professional template
✅ **Public share links** — shareable invoice URLs (no login)
✅ **WhatsApp share** — direct deep links
✅ **Bilingual** — English + नेपाली toggleable
✅ **NPR** — Indian/Nepali number grouping (Rs 1,25,000)
✅ **Multi-tenant** — each business sees only their data
✅ **Mobile-responsive** — works on phones

## Tech stack

- **Node.js 18+** with Express
- **SQLite** (better-sqlite3) — single-file database
- **EJS** templating
- **bcrypt** password hashing
- **Sessions** stored in SQLite

No build step, no React, no Docker required to get started.

---

## Setup (3 steps)

### 1. Install Node.js 18+
Download from [nodejs.org](https://nodejs.org).

### 2. Install dependencies
Open a terminal in this folder and run:
```
npm install
```

### 3. Initialize the database and start
```
npm run init-db
npm start
```

Open http://localhost:3000

---

## Login credentials

**Admin** (sees all companies):
- Email: `admin@pokhara.local`
- Password: `admin1234`

**Demo business** (full invoice system):
- Email: `demo@pokhara.local`
- Password: `demo1234`

Pre-loaded with 5 customers, 12 products, 8 invoices.

---

## File structure

```
pokhara-invoice/
├── server.js              # Main entry point
├── init-db.js             # Database setup + seed data
├── package.json
├── data/                  # SQLite database (auto-created)
├── lib/
│   ├── db.js              # Database connection
│   ├── format.js          # Currency, date formatting
│   └── i18n.js            # English + Nepali translations
├── middleware/
│   ├── requireAuth.js
│   └── requireAdmin.js
├── routes/
│   ├── public.js          # Landing, public invoice view
│   ├── auth.js            # Login, signup, logout
│   ├── dashboard.js       # User dashboard
│   ├── customers.js
│   ├── products.js
│   ├── invoices.js
│   ├── settings.js
│   └── admin.js           # Admin dashboard
├── views/                 # EJS templates
└── public/
    ├── css/style.css
    └── uploads/           # Business logos (auto-created)
```

---

## Deploying to your subdomain

### Option A — VPS (recommended)

You need a server with Node.js 18+ (any Ubuntu/Debian VPS works — DigitalOcean, Linode, Vultr, AWS Lightsail, etc).

**1. Upload the files:**
```bash
scp -r pokhara-invoice user@your-server:/home/user/
```

**2. Install Node + dependencies on server:**
```bash
ssh user@your-server
cd pokhara-invoice
npm install
npm run init-db
```

**3. Run with PM2 (keeps app alive):**
```bash
sudo npm install -g pm2
pm2 start server.js --name pokhara-invoice
pm2 startup
pm2 save
```

**4. Nginx reverse proxy** — create `/etc/nginx/sites-available/invoice`:
```nginx
server {
    listen 80;
    server_name invoice.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;
}
```

Enable + reload:
```bash
sudo ln -s /etc/nginx/sites-available/invoice /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**5. DNS** — at your domain registrar, add an **A record**:
- Type: `A`
- Name: `invoice` (or whatever subdomain you want)
- Value: your server's IP address

**6. HTTPS with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d invoice.yourdomain.com
```

Done! Visit https://invoice.yourdomain.com

### Option B — Shared hosting with Node support

Most cPanel hosts (Hostinger, A2 Hosting, etc) now support Node.js apps:

1. Upload the folder via FTP / file manager
2. In hosting panel → **Node.js Apps** → create new app
3. Set startup file: `server.js`
4. Set Node version: 18 or higher
5. Run `npm install` from the panel
6. Run `npm run init-db` from the panel terminal
7. In **Domains**, point your subdomain to the app
8. Start the app

---

## Environment variables (optional)

You can set these for production:
- `PORT` — default 3000
- `SESSION_SECRET` — change to a long random string
- `NODE_ENV=production`
- `HTTPS=true` — enables secure cookies (only set after HTTPS works)

Create a `.env` file or set them in PM2 / hosting panel.

---

## Backup

Just back up the `data/` folder. It contains `app.db` (everything) and `sessions.db`.

```bash
# Daily backup
0 2 * * * tar -czf /backup/invoice-$(date +\%Y\%m\%d).tar.gz /home/user/pokhara-invoice/data/
```

---

## Customize

- **Branding:** change colors in `public/css/style.css` (search for `--primary`)
- **Translations:** edit `lib/i18n.js`
- **Invoice template:** edit `views/invoice-print.ejs`
- **Add features:** routes go in `routes/`, views go in `views/`

---

## Troubleshooting

**"better-sqlite3 not found":**
- You may need build tools: `sudo apt install build-essential python3` on Linux
- Then `npm install` again

**Port 3000 in use:**
- `PORT=4000 npm start`

**Session not persisting:**
- Make sure `data/` directory is writable

**Devanagari not rendering in PDF:**
- The print view uses Google Fonts CDN — make sure the server can reach `fonts.googleapis.com`

---

## License

MIT — use this however you want for your business.
