# RentPro — Equipment Rental & Event Production Management

A full-stack SaaS web application for managing equipment rentals, crew scheduling, and event productions — built for **Stereo Sound OÜ**.

---

## Tech Stack

| Layer      | Technology                              |
|------------|----------------------------------------|
| Frontend   | React 18 + TypeScript + Tailwind CSS   |
| Backend    | Node.js + Express (REST API)           |
| Database   | PostgreSQL                             |
| Auth       | JWT (JSON Web Tokens)                  |
| Charts     | Recharts                               |
| Email      | Nodemailer                             |

---

## Features

- **Dashboard** — Active projects, key metrics, upcoming bookings
- **Equipment / Inventory** — Full CRUD, QR codes, check-in/out logs, real-time stock tracking
- **Projects & Bookings** — Status workflow, equipment assignment with warehouse stock validation, crew scheduling, task board
- **Crew Scheduling** — Crew profiles with skills, roles, and availability
- **Calendar** — Monthly view of all projects with click-to-view details
- **Quotes** — Fully editable, auto-populate from project, PDF export, send to client via email
- **Invoices** — Full lifecycle (Draft → Sent → Paid → Overdue), PDF export, email sending
- **CRM** — Client database with project history and communication log
- **Analytics** — Revenue charts, equipment utilization, top clients, crew hours
- **Landing Page** — Full marketing page with hero, features, use-cases

---

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- npm or yarn

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone <repo-url>
cd Rental-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
psql -U postgres -c "CREATE DATABASE rental_app;"
```

Run the schema and seed files:

```bash
psql -U postgres -d rental_app -f backend/src/db/schema.sql
psql -U postgres -d rental_app -f backend/src/db/seed.sql
```

### 3. Configure Environment

Copy the example env file and fill in your values:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/rental_app
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3001
FRONTEND_URL=http://localhost:5173

# Optional: Email configuration (uses console.log if not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=karmogudinas@gmail.com
```

### 4. Start the Application

**Backend** (in `backend/` directory):
```bash
npm run dev
# Server starts on http://localhost:3001
```

**Frontend** (in `frontend/` directory):
```bash
npm run dev
# App starts on http://localhost:5173
```

### 5. Default Login

After running the seed data, you can log in with:

| Email                      | Password   | Role    |
|----------------------------|------------|---------|
| admin@stereosound.ee       | admin123   | Admin   |
| karmo@stereosound.ee       | admin123   | Manager |
| jaanus@stereosound.ee      | admin123   | Crew    |

---

## Project Structure

```
Rental-app/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express app entry point
│   │   ├── config/
│   │   │   └── database.js       # PostgreSQL pool config
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT authentication middleware
│   │   │   └── errorHandler.js   # Global error handler
│   │   ├── routes/               # Route definitions
│   │   ├── controllers/          # Business logic
│   │   ├── db/
│   │   │   ├── schema.sql        # Database schema
│   │   │   └── seed.sql          # Sample data
│   │   └── utils/
│   │       └── emailService.js   # Nodemailer email service
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.tsx               # Router setup
    │   ├── main.tsx
    │   ├── index.css
    │   ├── components/
    │   │   ├── Layout.tsx        # App shell (sidebar + topbar)
    │   │   ├── Sidebar.tsx       # Navigation sidebar
    │   │   ├── TopBar.tsx        # Top header bar
    │   │   └── PrivateRoute.tsx  # Auth guard
    │   ├── context/
    │   │   └── AuthContext.tsx   # Auth state management
    │   ├── pages/
    │   │   ├── Landing.tsx       # Marketing landing page
    │   │   ├── Login.tsx
    │   │   ├── Register.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── Equipment.tsx
    │   │   ├── Projects.tsx
    │   │   ├── ProjectDetail.tsx # Full project management
    │   │   ├── Crew.tsx
    │   │   ├── Calendar.tsx
    │   │   ├── Quotes.tsx
    │   │   ├── QuoteDetail.tsx   # Editable quote with PDF export
    │   │   ├── Invoices.tsx
    │   │   ├── InvoiceDetail.tsx # Editable invoice with PDF export
    │   │   ├── CRM.tsx
    │   │   ├── ClientDetail.tsx
    │   │   └── Analytics.tsx
    │   └── utils/
    │       ├── api.ts            # Axios instance with JWT
    │       └── auth.ts           # Auth helper functions
    ├── tailwind.config.js
    ├── vite.config.ts
    └── package.json
```

---

## API Endpoints

| Resource              | Endpoints                                                      |
|-----------------------|----------------------------------------------------------------|
| Auth                  | POST /api/auth/register, /login · GET /api/auth/me             |
| Categories            | GET, POST /api/categories                                      |
| Equipment             | GET, POST /api/equipment · GET, PUT, DELETE /api/equipment/:id · GET /api/equipment/:id/qrcode · GET, POST /api/equipment/:id/logs |
| Projects              | GET, POST /api/projects · GET, PUT, DELETE /api/projects/:id  |
| Project Equipment     | GET, POST /api/projects/:id/equipment · PUT, DELETE /api/projects/:id/equipment/:itemId |
| Project Crew          | GET, POST /api/projects/:id/crew · DELETE /api/projects/:id/crew/:memberId |
| Project Tasks         | GET, POST /api/projects/:id/tasks · PUT, DELETE /api/projects/:id/tasks/:taskId |
| Crew Members          | GET, POST /api/crew · GET, PUT, DELETE /api/crew/:id           |
| Quotes                | GET, POST /api/quotes · GET, PUT, DELETE /api/quotes/:id · POST /api/quotes/:id/send |
| Invoices              | GET, POST /api/invoices · GET, PUT, DELETE /api/invoices/:id · POST /api/invoices/:id/send |
| Clients               | GET, POST /api/clients · GET, PUT, DELETE /api/clients/:id · GET, POST /api/clients/:id/communications |
| Analytics             | GET /api/analytics/overview, /revenue, /equipment-utilization, /top-clients, /crew-hours |

---

## PDF Export

Both Quotes and Invoices support PDF export via browser print (`Ctrl+P` or the "Download PDF" button). The print stylesheet hides all navigation elements and renders only the document content in Estonian business document format.

---

## Company Info (Pre-configured)

All documents are pre-configured with:
- **Company:** Stereo Sound OÜ
- **Address:** Sõpruse pst 219-7, Mustamäe linnaosa, 13414 Tallinn, Harju maakond
- **Email:** karmogudinas@gmail.com
- **Phone:** +3725068422
- **VAT:** 20% (Estonian standard)
