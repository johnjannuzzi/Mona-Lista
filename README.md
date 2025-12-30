# Mona Lista

Beautiful wishlists, artfully shared. Inspired by the timeless elegance of Renaissance art.

![Mona Lista](https://img.shields.io/badge/version-1.0.0-722F37)

## Features

- 🎨 **Beautiful Design** — Warm, Renaissance-inspired palette with elegant typography
- 🔐 **Google OAuth** — Simple, secure sign-in
- 📝 **Multiple Lists** — Create wishlists for any occasion
- 🔗 **Smart URL Scraping** — Paste any product URL to auto-fill details
- 🎁 **Private Claiming** — Friends can claim gifts without spoiling surprises
- ⭐ **Top Choices** — Highlight your most-wanted items
- 📚 **Bookmarklet** — Add items from any site with one click
- 💰 **Affiliate Ready** — ShopMy integration for monetization

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Auth**: Passport.js + Google OAuth
- **Hosting**: Railway

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/mona-lista.git
cd mona-lista
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Database Setup

Create a PostgreSQL database and run the schema:

```bash
psql -d your_database -f server/schema.sql
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`

### 4. Environment Variables

Copy the example env file and fill in your values:

```bash
cp server/.env.example server/.env
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Random string for session encryption
- `GOOGLE_CLIENT_ID` — From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — From Google Cloud Console
- `GOOGLE_CALLBACK_URL` — OAuth callback URL
- `CLIENT_URL` — Frontend URL for CORS

### 5. Run Locally

```bash
# From root directory
npm run dev
```

This starts both the client (port 5173) and server (port 3001).

## Railway Deployment

### 1. Create Railway Project

1. Create new project in Railway
2. Add PostgreSQL plugin
3. Connect your GitHub repo

### 2. Configure Environment

Add the following environment variables in Railway:

```
DATABASE_URL=<auto-filled by Railway>
SESSION_SECRET=<generate a strong random string>
GOOGLE_CLIENT_ID=<your Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<your Google OAuth secret>
GOOGLE_CALLBACK_URL=https://your-app.railway.app/auth/google/callback
CLIENT_URL=https://your-app.railway.app
NODE_ENV=production
```

### 3. Update Google OAuth

Add your Railway URL to authorized redirect URIs in Google Cloud Console.

### 4. Run Database Migration

In Railway's terminal:

```bash
psql $DATABASE_URL -f server/schema.sql
```

## Project Structure

```
mona-lista/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Route pages
│   │   └── styles/         # Global styles
│   └── index.html
├── server/                 # Express backend
│   ├── routes/             # API routes
│   ├── schema.sql          # Database schema
│   └── index.js            # Server entry
└── package.json
```

## Fonts

Mona Lista uses custom fonts:
- **Benditos** — Display/headline font
- **Birdie** — Body text

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Umber Shadow | `#2C2416` | Background |
| Sfumato Brown | `#5C4A32` | Muted text |
| Golden Ochre | `#8B6914` | Accents |
| Gilded Amber | `#C9A227` | Primary accent |
| Renaissance Red | `#722F37` | Primary action |
| Parchment | `#E8DCC4` | Text |
| Vellum White | `#FFF8E7` | Highlights |

## License

MIT

---

Made with ♥ and a love for timeless beauty.
