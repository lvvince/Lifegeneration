# Life Generation

A web portal for the Life Generation youth community, providing member management, discipleship groups, ministry applications, event coordination, and prayer requests.

---

## Features

- **Discipleship Groups (D-Groups)**: Directory of groups, schedules, leaders, and meeting venues.
- **Ministries**: Information on volunteer teams with an online application workflow.
- **Events & Attendance**: Upcoming events with RSVP and digital check-in support.
- **Prayer Wall**: Community prayer requests with options for public or anonymous posts.
- **Theme Support**: Seamless dark mode and light mode switching.
- **Role-Based Access**:
  - Member: Profile overview, registered events, application statuses.
  - Admin: Member directory, application reviews, event check-ins, and metrics.

---

## Tech Stack

- **Frontend**: React, Vite, React Router, Lucide Icons, CSS
- **Backend**: LavaLust (PHP MVC Framework), RESTful API, JWT
- **Database**: MySQL

---

## Getting Started

### 1. Database
Import `database.sql` into MySQL to set up the `lifegenerationdb` database and initial seed records.

### 2. Backend
1. Copy `backend/.env.example` to `backend/.env`.
2. Configure your database credentials and secret key.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

The application runs locally on `http://localhost:5173`.

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | password123 |
| Member | user@example.com | password123 |

---

## License

Developed for the Life Generation community. All rights reserved.
