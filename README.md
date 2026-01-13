# ???????? Tunisian Family Tree

A **multi-tenant full-stack application** for managing Tunisian family trees with an **Obsidian-style interactive graph visualization**, collaborative editing, progress tracking, and comprehensive family management.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue.svg)

---

## ??? Features

### Core Features
- ???? **JWT Authentication** - Secure login/register with role-based access (ADMIN, EDITOR, VIEWER)
- ????????????????????????? **Multi-tenant Architecture** - Each family can only edit their own data, but view all families
- ???? **Interactive Family Graph** - Obsidian-style force-directed visualization with drag, pan, zoom
- ???? **Cross-family Marriages** - Spouse relationships can span different families
- ??????? **City Filtering** - Filter people by their current city

### Advanced Features
- ???? **Command Palette** - Quick search with Ctrl+K / Cmd+K
- ???? **Focus Mode** - Explore specific person's relatives with adjustable depth (1-5 hops)
- ?????? **Path Finding** - Find relationship path between any two people (degrees of separation)
- ???? **Saved Views** - Save and load custom graph filter configurations
- ???? **Progress Tracking** - Track family tree completeness with detailed metrics
- ???? **Activity Timeline** - View recent changes and collaboration history
- ???? **User Management** - Admin panel for managing family users and roles

---

## ???? Quick Start

### Prerequisites

- **Node.js 18+**
- **PostgreSQL 14+** (or Docker)

### 1. Clone the repository

```bash
git clone https://github.com/JedidiAymen/tunisian-family-tree.git
cd tunisian-family-tree
```

### 2. Start PostgreSQL with Docker

```bash
docker run -d \
  --name tun_family_pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tun_family_dev \
  -p 5432:5432 \
  postgres:16
```

### 3. Initialize the database

```bash
# Wait a few seconds for PostgreSQL to start, then run schema:
docker exec -i tun_family_pg psql -U postgres -d tun_family_dev < server/sql/schema.sql

# Load sample data (14 families, 94 people, 119 relationships):
docker exec -i tun_family_pg psql -U postgres -d tun_family_dev < server/sql/seed_data.sql
```

### 4. Start the Server

```bash
cd server
cp .env.example .env
npm install
node src/server.js     # Runs on http://localhost:4000
```

### 5. Start the Client

```bash
cd client
npm install
npm run dev            # Runs on http://localhost:5173
```

### 6. Open in Browser

Navigate to **http://localhost:5173**

---

## ???? Test Accounts

Use these accounts to test the application:

| Email | Password | Role | Family |
|-------|----------|------|--------|
| admin@benali.tn | password123 | ADMIN | Ben Ali |
| editor@benali.tn | password123 | EDITOR | Ben Ali |
| admin@trabelsi.tn | password123 | ADMIN | Trabelsi |
| tarek@bouazizi.tn | password123 | ADMIN | Bouazizi |
| habib@hammami.tn | password123 | ADMIN | Hammami |
| salem@jebali.tn | password123 | ADMIN | Jebali |
| brahim@khelifi.tn | password123 | ADMIN | Khelifi |
| slaheddine@marzougui.tn | password123 | ADMIN | Marzougui |
| moncef@nasri.tn | password123 | ADMIN | Nasri |
| adel@oueslati.tn | password123 | ADMIN | Oueslati |
| abdallah@saidi.tn | password123 | ADMIN | Saidi |
| salah@turki.tn | password123 | ADMIN | Turki |
| mustapha@zarrouk.tn | password123 | ADMIN | Zarrouk |

### Role Permissions

| Role | View All | Edit Own Family | Manage Users | Delete |
|------|----------|-----------------|--------------|--------|
| ADMIN | ??? | ??? | ??? | ??? |
| EDITOR | ??? | ??? | ??? | ??? |
| VIEWER | ??? | ??? | ??? | ??? |

---

## ???? API Reference

**Base URL:** http://localhost:4000/api/v1

### Authentication
All protected routes require header: `Authorization: Bearer <token>`

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login and get token |
| GET | /auth/me | Get current user info |

#### POST /auth/login
```json
// Request
{ "email": "admin@benali.tn", "password": "password123" }

// Response
{ "accessToken": "eyJhbGciOi...", "user": { "id": "uuid", "role": "ADMIN" } }
```

### People Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | /people | List all people | Any |
| GET | /people/:id | Get person by ID | Any |
| POST | /people | Create person | ADMIN/EDITOR |
| PUT | /people/:id | Update person | ADMIN/EDITOR |
| DELETE | /people/:id | Delete person | ADMIN |
| GET | /people/families | List all families | Any |
| GET | /people/cities | List all cities | Any |

### Tree Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | /tree/edges | Get all relationships | Any |
| POST | /tree/edges | Create relationship | ADMIN/EDITOR |
| DELETE | /tree/edges/:id | Delete relationship | ADMIN |
| GET | /tree/graph | Get full graph data | Any |

### Graph Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /graph/search?q=name | Search people |
| GET | /graph/focus/:personId | Get focused subgraph |
| GET | /graph/path?fromId=&toId= | Find relationship path |
| GET | /graph/views | Get saved views |
| POST | /graph/views | Save a view |

### Progress Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /progress/family | Get completeness score |
| GET | /progress/tasks | Get improvement tasks |
| GET | /progress/occupations | Get occupation stats |
| GET | /progress/locations | Get location stats |

### User Management Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | /users | List family users | ADMIN |
| GET | /users/stats | Get family stats | Any |
| POST | /users/invite | Create new user | ADMIN |
| PATCH | /users/:id/role | Update user role | ADMIN |
| DELETE | /users/:id | Remove user | ADMIN |

### Events Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /events | Get person events |
| POST | /events | Create event |
| PUT | /events/:id | Update event |
| DELETE | /events/:id | Delete event |

Event Types: BIRTH, DEATH, MARRIAGE, DIVORCE, GRADUATION, JOB_START, JOB_END, MIGRATION, OTHER

### Collaboration Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | /collaboration/requests | Get change requests | Any |
| POST | /collaboration/requests | Create request | Any |
| PATCH | /collaboration/requests/:id | Approve/reject | ADMIN |
| GET | /collaboration/activity | Get audit log | Any |

---

## ??????? Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| families | Family groups |
| users | User accounts with roles |
| people | Family members |
| family_tree_edges | Relationships (PARENT_OF, SPOUSE_OF) |
| person_events | Life events |
| saved_views | Graph configurations |
| change_requests | Collaboration requests |
| audit_log | Activity tracking |

---

## ???? Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + K | Open command palette |
| Escape | Exit focus mode |
| Double-click | Focus on person |

## ??????? Mouse Controls

| Action | Effect |
|--------|--------|
| Drag node | Move node |
| Drag background | Pan view |
| Mouse wheel | Zoom |
| Hover | Highlight connections |
| Click | Show details |

---

## ???? Environment Variables

### Server (server/.env)

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tun_family_dev
JWT_SECRET=your-super-secret-jwt-key
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

---

## ???? Sample Data

| Category | Count |
|----------|-------|
| Families | 14 |
| People | 94 |
| Relationships | 119 |
| Events | 275 |
| Cities | 24 |
| Generations | 4 |

---

## ???? License

MIT License

---

Made with ?????? for Tunisian families
