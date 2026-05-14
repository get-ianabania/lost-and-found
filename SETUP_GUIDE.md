# PLSP Lost & Found Management System
## Complete Setup Guide — Pamantasan ng Lungsod ng San Pablo

---

## 📁 PROJECT FOLDER STRUCTURE

```
plsp-lost-found/
├── .gitignore
├── SETUP_GUIDE.md
│
├── database/
│   └── schema.sql                     ← Run this first to create all 13 tables
│
├── backend/                           ← Go API server (port 8080)
│   ├── main.go                        ← Entry point, starts the server
│   ├── go.mod                         ← Go package dependencies
│   ├── .env.example                   ← Copy to .env and fill in your values
│   ├── config/
│   │   └── database.go                ← PostgreSQL connection via GORM
│   ├── models/
│   │   └── models.go                  ← All DB structs + request/response types
│   ├── middleware/
│   │   └── auth.go                    ← JWT validation + role-based guards
│   ├── controllers/
│   │   ├── auth_controller.go         ← Register, Login
│   │   ├── item_controller.go         ← Lost/found CRUD + photo upload
│   │   ├── claim_controller.go        ← Claim submission + quiz verification
│   │   ├── message_controller.go      ← In-app messaging
│   │   ├── notification_controller.go ← System notifications
│   │   ├── analytics_controller.go    ← Stats, hotspots, 30-day trends
│   │   ├── admin_controller.go        ← User management, profile, avatar
│   │   └── map_controller.go          ← Campus map GPS coordinates
│   ├── routes/
│   │   └── routes.go                  ← All 38 API route definitions
│   └── uploads/                       ← Photo uploads saved here (you create this)
│       ├── items/
│       └── avatars/
│
└── frontend/                          ← Next.js 15 app (port 3000)
    ├── package.json                   ← Next.js 15, React 19, all dependencies
    ├── tsconfig.json
    ├── tailwind.config.js             ← Tailwind CSS config (plain .js)
    ├── postcss.config.js              ← PostCSS config (plain .js)
    ├── next.config.ts                 ← Next.js config (.ts supported in v15)
    ├── .env.local                     ← Points frontend to backend API
    ├── .vscode/
    │   └── settings.json              ← Stops VS Code flagging @tailwind
    └── src/
        ├── app/
        │   ├── layout.tsx             ← Root layout with Toaster
        │   ├── globals.css            ← @tailwind directives
        │   ├── page.tsx               ← Redirects to /login or /dashboard
        │   ├── (auth)/
        │   │   ├── login/page.tsx     ← Login page
        │   │   └── register/page.tsx  ← Registration with password strength
        │   └── (dashboard)/
        │       ├── layout.tsx         ← Auth guard + wraps with DashboardLayout
        │       ├── dashboard/page.tsx ← Home: stats cards + recent items
        │       ├── items/
        │       │   ├── page.tsx            ← Browse all items + search + filters
        │       │   ├── [id]/page.tsx       ← Item detail + claim modal + quiz
        │       │   └── report/page.tsx     ← Report lost/found + drag-drop photos
        │       ├── my-items/page.tsx       ← My reports + status update dropdown
        │       ├── my-claims/page.tsx      ← My claim status tracker
        │       ├── messages/page.tsx       ← Full in-app chat with conversations
        │       ├── notifications/page.tsx  ← Notification list + mark as read
        │       ├── map/page.tsx            ← Leaflet campus map with pins
        │       └── admin/
        │           ├── page.tsx            ← Admin dashboard + charts
        │           ├── users/page.tsx      ← User management + role changer
        │           ├── claims/page.tsx     ← Approve / reject claims
        │           ├── analytics/page.tsx  ← Bar, Pie, Area charts + hotspots
        │           └── audit/page.tsx      ← Full system audit trail
        ├── components/
        │   ├── layout/
        │   │   └── DashboardLayout.tsx    ← Sidebar + topbar + mobile responsive
        │   └── map/
        │       └── LeafletMap.tsx         ← Leaflet map (dynamically imported)
        ├── lib/
        │   ├── api.ts                     ← Axios instance + all API functions + types
        │   └── utils.ts                   ← cn(), getStatusConfig(), helpers
        └── store/
            └── authStore.ts               ← Zustand auth state (persisted)
```

---

## 🔧 PHASE 1: Install Prerequisites

### Step 1: Install Node.js
1. Go to https://nodejs.org
2. Download **Node.js 20 LTS** (or newer)
3. Install — keep all default settings
4. Verify in terminal:
```bash
node --version
# Should show v20.x.x or higher
```

### Step 2: Install Go
1. Go to https://go.dev/dl/
2. Download **Go 1.21** for Windows (`.msi` file)
3. Install — keep all default settings
4. **Close and reopen VS Code** after installing
5. Verify:
```bash
go version
# Should show go1.21.x or higher
```

### Step 3: Install PostgreSQL
1. Go to https://www.postgresql.org/download/windows/
2. Download **PostgreSQL 16**
3. Run the installer
4. During install:
   - Set a password for user `postgres` — **write this down!**
   - Keep default port: `5432`
5. pgAdmin 4 is included — this is your database GUI

---

## 🗄️ PHASE 2: Database Setup

### Step 1: Create the database
1. Open **pgAdmin 4** from the Start menu
2. Connect using your postgres password
3. Right-click **Databases** → **Create** → **Database**
4. Name: `plsp_lost_found` → Click **Save**

### Step 2: Run the schema
1. Click `plsp_lost_found` in the left panel to select it
2. Click the **Query Tool** icon (lightning bolt)
3. Open `database/schema.sql` in VS Code → `Ctrl+A` → `Ctrl+C`
4. Paste into pgAdmin's Query Tool → Press **F5**
5. You should see: *"Query returned successfully"*

Verify by expanding: `plsp_lost_found` → `Schemas` → `public` → `Tables`
You should see **13 tables** ✅

---

## ⚙️ PHASE 3: Backend Setup

### Step 1: Go to the backend folder
```bash
cd backend
```

### Step 2: Create your .env file
```bash
# Windows Command Prompt:
copy .env.example .env

# PowerShell or Mac/Linux:
cp .env.example .env
```

Open `.env` and update these two lines:
```env
DB_PASSWORD=your_postgres_password_here
JWT_SECRET=any_long_random_string_at_least_32_characters_long
```
Leave everything else as-is.

### Step 3: Create the uploads folders
```bash
# Windows Command Prompt:
mkdir uploads\items
mkdir uploads\avatars

# PowerShell or Mac/Linux:
mkdir -p uploads/items uploads/avatars
```

### Step 4: Install Go packages
```bash
go mod tidy
```
Takes 1–2 minutes. Downloads all packages from the internet.

### Step 5: Start the backend
```bash
go run main.go
```

You should see:
```
✅ Connected to PostgreSQL database
🚀 PLSP Lost & Found API running on port 8080
```

### Step 6: Test it
Open browser → **http://localhost:8080/health**

Should show:
```json
{"service": "PLSP Lost & Found API", "status": "ok"}
```
✅ Backend is working!

---

## 🖥️ PHASE 4: Frontend Setup

### Step 1: Open a second terminal
Press **Ctrl + Shift + `** in VS Code to open a new terminal tab.
**Do not close the backend terminal.**

### Step 2: Go to the frontend folder
```bash
cd frontend
```

### Step 3: Install packages
```bash
npm install
```
Takes 2–5 minutes. You will see `npm warn deprecated` messages — **ignore them**, they are harmless warnings from sub-packages.

### Step 4: Start the frontend
```bash
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
✓ Ready
```

### Step 5: Open the app
Go to: **http://localhost:3000**

You will see the login page with full Tailwind styling. ✅

---

## ℹ️ About VS Code Warnings in globals.css

You may see red underlines under `@tailwind base`, `@tailwind components`, and `@tailwind utilities` in VS Code. This is **NOT an error** — it is just VS Code's built-in CSS linter not recognizing Tailwind directives.

The project includes `.vscode/settings.json` which disables this linter. If the red lines still appear:
1. Close VS Code completely
2. Reopen the `frontend` folder
3. The underlines should be gone

The app will work correctly regardless of those underlines.

---

## 👤 PHASE 5: Create Your First Account

### Option A — Register normally
1. Click **"Register here"** on the login page
2. Fill in your details and submit
3. Log in with your new account

### Option B — Make yourself admin
After registering, open pgAdmin → Query Tool and run:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```
Log in again — you'll be sent to the Admin Dashboard.

### Option C — Use the default seeded admin
Run this in pgAdmin to set its password to `password`:
```sql
UPDATE users
SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE email = 'admin@plsp.edu.ph';
```
- **Email:** `admin@plsp.edu.ph`
- **Password:** `password`

> ⚠️ Change this immediately in a real deployment!

---

## 🔌 How the Three Layers Connect

```
[Browser — localhost:3000]
        ↓
[Next.js Frontend]
  · Zustand stores the JWT token in localStorage
  · Axios adds "Authorization: Bearer <token>" to every request
        ↓  HTTP requests
[Go Backend — localhost:8080]
  · JWT middleware checks the token
  · Controller handles the logic
  · GORM runs SQL queries
        ↓
[PostgreSQL — localhost:5432]
  · Stores all data
  · Returns results
```

---

## 🚀 Daily Development Workflow

Open **two terminals** every time you work:

**Terminal 1 — Backend:**
```bash
cd backend
go run main.go
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 📋 All API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Create account | None |
| POST | `/api/v1/auth/login` | Login, get JWT | None |
| GET | `/api/v1/users/me` | My profile | JWT |
| PUT | `/api/v1/users/me` | Update profile | JWT |
| POST | `/api/v1/users/me/avatar` | Upload avatar | JWT |
| GET | `/api/v1/items` | Browse items | JWT |
| POST | `/api/v1/items` | Report item | JWT |
| GET | `/api/v1/items/mine` | My items | JWT |
| GET | `/api/v1/items/:id` | Item detail | JWT |
| PATCH | `/api/v1/items/:id/status` | Update status | JWT |
| POST | `/api/v1/items/:id/photos` | Upload photos | JWT |
| POST | `/api/v1/items/:id/quiz` | Set quiz questions | JWT |
| DELETE | `/api/v1/items/:id` | Delete item | JWT |
| POST | `/api/v1/claims` | Submit claim | JWT |
| GET | `/api/v1/claims/mine` | My claims | JWT |
| POST | `/api/v1/claims/:id/quiz` | Answer quiz | JWT |
| POST | `/api/v1/messages` | Send message | JWT |
| GET | `/api/v1/messages/conversations` | All chats | JWT |
| GET | `/api/v1/messages/unread-count` | Unread count | JWT |
| GET | `/api/v1/messages/:userId` | Chat history | JWT |
| PATCH | `/api/v1/messages/:id/read` | Mark read | JWT |
| GET | `/api/v1/notifications` | My notifications | JWT |
| PATCH | `/api/v1/notifications/:id/read` | Mark one read | JWT |
| PATCH | `/api/v1/notifications/read-all` | Mark all read | JWT |
| GET | `/api/v1/analytics/summary` | Stats overview | JWT |
| GET | `/api/v1/analytics/hotspots` | Loss hotspots | JWT |
| GET | `/api/v1/analytics/by-category` | By category | JWT |
| GET | `/api/v1/analytics/trends` | 30-day trend | JWT |
| GET | `/api/v1/map` | Map pin data | JWT |
| POST | `/api/v1/map/items/:id` | Set coordinates | JWT |
| GET | `/api/v1/admin/users` | All users | Admin |
| PATCH | `/api/v1/admin/users/:id/role` | Change role | Admin |
| PATCH | `/api/v1/admin/users/:id/status` | Enable/disable | Admin |
| GET | `/api/v1/admin/claims` | All claims | Admin |
| POST | `/api/v1/admin/claims/:id/decision` | Approve/reject | Admin |
| PATCH | `/api/v1/admin/items/:id/archive` | Archive item | Admin |
| GET | `/api/v1/admin/audit-trail` | System logs | Admin |
| GET | `/api/v1/admin/analytics` | Admin stats | Admin |
| GET | `/api/v1/admin/dashboard-stats` | Dashboard KPIs | Admin |

---

## 🛠️ Troubleshooting

**❌ `npm warn deprecated` during npm install**
→ These are harmless warnings. Ignore them. Run `npm run dev` anyway.

**❌ `@tailwind` red underlines in globals.css**
→ Not a real error. Just VS Code's CSS linter. The `.vscode/settings.json` file disables it. Restart VS Code if they persist.

**❌ `./globals.css` error in layout.tsx**
→ Same cause as above — VS Code linter false alarm. App still runs fine.

**❌ `next.config.ts is not supported`**
→ You are on Next.js 14. The new zip uses Next.js 15 which supports `.ts` config. Delete `node_modules`, run `npm install` again.

**❌ Cannot connect to database**
→ Check `DB_PASSWORD` in `backend/.env` matches your PostgreSQL install password.
→ Make sure PostgreSQL service is running (check Windows Services).

**❌ `go: command not found`**
→ Close VS Code and reopen after installing Go. Or restart your PC.

**❌ `npm: command not found`**
→ Close VS Code and reopen after installing Node.js. Or restart your PC.

**❌ Port 8080 already in use**
→ Change `PORT=8081` in `backend/.env`
→ Change `NEXT_PUBLIC_API_URL=http://localhost:8081/api/v1` in `frontend/.env.local`

**❌ Map shows blank white box**
→ Hard refresh: `Ctrl + Shift + R`
→ Needs internet to load OpenStreetMap tiles.

**❌ Hydration error on page load**
→ Hard refresh: `Ctrl + Shift + R`
→ Or restart `npm run dev`.

---

## 🔐 Before Going Live (Production)

| Setting | Change to |
|---------|-----------|
| `JWT_SECRET` | 64-char random: run `openssl rand -base64 64` |
| `DB_SSL_MODE` | `require` |
| `GIN_MODE` | `release` |
| `FRONTEND_URL` | Your real domain |
| Admin password | Change immediately after first login |

---

## 📦 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js | 15.x |
| UI Library | React | 19.x |
| Styling | Tailwind CSS | 3.x |
| State | Zustand | 5.x |
| HTTP Client | Axios | 1.x |
| Forms | React Hook Form + Zod | Latest |
| Charts | Recharts | 2.x |
| Map | Leaflet + React-Leaflet | 1.9 / 4.x |
| Toasts | React Hot Toast | 2.x |
| Backend | Go + Gin | 1.21 / 1.9 |
| ORM | GORM | 1.25 |
| Auth | JWT | HS256 |
| Passwords | bcrypt | Default cost |
| Database | PostgreSQL | 16 |
