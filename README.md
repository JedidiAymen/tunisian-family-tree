# 🇹🇳 Tunisian Family Names & Family Tree

A **multi-tenant full-stack application** for managing Tunisian family trees with an **Obsidian-style interactive graph visualization**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue.svg)

## ✨ Features

- 🔐 **JWT Authentication** - Secure login/register with role-based access (ADMIN, EDITOR, VIEWER)
- 👨‍👩‍👧‍👦 **Multi-tenant Architecture** - Each family can only edit their own data, but view all families
- 🌳 **Interactive Family Graph** - Obsidian-style force-directed visualization with drag, pan, zoom
- 💒 **Cross-family Marriages** - Spouse relationships can span different families
- 🏙️ **City Filtering** - Filter people by their current city
- 📱 **Modern UI** - Beautiful dark theme with glassmorphism effects

## 🖼️ Screenshots

### Obsidian-Style Graph View
- Floating nodes with physics simulation
- Family clustering with color coding
- Drag nodes to reorganize
- Hover to highlight connections
- Zoom and pan navigation

### Dashboard
- List of all family members
- Add/edit people and relationships
- Cross-family spouse selection

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Docker** (for PostgreSQL) or PostgreSQL 14+ installed locally

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/tunisian-family-tree.git
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

# Load sample data (14 families, 94 people, 129 relationships):
docker exec -i tun_family_pg psql -U postgres -d tun_family_dev < server/sql/seed_data.sql
```

> 💡 **Tip:** The seed data includes complete Tunisian families with cross-family marriages, multiple generations, and realistic data from cities like Tunis, Sfax, Sousse, and more!

### 4. Start the Server

```bash
cd server
cp .env.example .env   # Edit if needed
npm install
npm run dev            # Runs on http://localhost:4000
```

### 5. Start the Client

```bash
cd client
npm install
npm run dev            # Runs on http://localhost:5173
```

### 6. Open in Browser

Navigate to `http://localhost:5173`

**Default test accounts:**
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

---

## 📁 Project Structure

```
tunisian-family-tree/
├── client/                 # React (Vite) Frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React Context (Auth)
│   │   ├── pages/          # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── GraphPage.jsx   # Obsidian-style graph
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── apiClient.js    # API helper
│   │   ├── App.jsx         # Routes
│   │   └── main.jsx
│   └── package.json
│
├── server/                 # Node.js + Express Backend
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── people.controller.js
│   │   │   └── tree.controller.js
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API routes
│   │   ├── db.js           # PostgreSQL connection
│   │   └── server.js       # Express app
│   ├── sql/
│   │   └── schema.sql      # Database schema
│   └── package.json
│
└── README.md
```

---

## 🔌 API Reference

Base URL: `http://localhost:4000/api/v1`

### Authentication

All protected routes require the header:
```
Authorization: Bearer <token>
```

#### `POST /auth/register`
Register a new user and automatically create a person record.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "Ahmed",
  "lastName": "Ben Ali",
  "familyName": "Ben Ali",
  "currentCity": "Tunis"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "ADMIN",
    "familyId": "uuid"
  }
}
```

**Notes:**
- If `familyName` exists, user joins as VIEWER
- If `familyName` is new, user becomes ADMIN of that family
- A person record is auto-created in the `people` table

---

#### `POST /auth/login`
Authenticate and get a JWT token.

**Request Body:**
```json
{
  "email": "admin@benali.tn",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "admin@benali.tn",
    "role": "ADMIN",
    "familyId": "uuid"
  }
}
```

---

#### `GET /auth/me`
Get current user info.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "uuid",
  "email": "admin@benali.tn",
  "role": "ADMIN",
  "familyId": "uuid"
}
```

---

### People

#### `GET /people`
Get all people (cross-family viewing).

**Query Parameters:**
- `familyId` (optional) - Filter by family
- `city` (optional) - Filter by current city

**Response:**
```json
[
  {
    "id": "uuid",
    "first_name": "Mohamed",
    "last_name": "Ben Ali",
    "family_id": "uuid",
    "family_name": "Ben Ali",
    "current_city": "Tunis",
    "canEdit": true
  }
]
```

---

#### `POST /people`
Create a new person. **Requires ADMIN or EDITOR role.**

**Request Body:**
```json
{
  "firstName": "Fatma",
  "lastName": "Ben Ali",
  "currentCity": "Sfax"
}
```

**Response:** Created person object

---

#### `PUT /people/:id`
Update a person. **Can only edit own family members.**

---

#### `DELETE /people/:id`
Delete a person. **Requires ADMIN role.**

---

#### `GET /people/families`
Get list of all families.

**Response:**
```json
[
  { "id": "uuid", "name": "Ben Ali" },
  { "id": "uuid", "name": "Trabelsi" }
]
```

---

#### `GET /people/cities`
Get distinct cities.

**Response:**
```json
["Tunis", "Sfax", "Sousse", "Kairouan"]
```

---

### Family Tree (Relationships)

#### `GET /tree/edges`
Get all relationship edges.

**Query Parameters:**
- `familyOnly=true` - Only return edges from user's family

**Response:**
```json
[
  {
    "id": "uuid",
    "family_id": "uuid",
    "from": "person-uuid",
    "to": "person-uuid",
    "type": "PARENT_OF",
    "canEdit": true
  }
]
```

**Edge Types:**
- `PARENT_OF` - Parent to child relationship
- `SPOUSE_OF` - Marriage/spouse relationship (can be cross-family)

---

#### `POST /tree/edges`
Create a relationship. **Requires ADMIN or EDITOR role.**

**Request Body:**
```json
{
  "fromPerson": "parent-uuid",
  "toPerson": "child-uuid",
  "type": "PARENT_OF"
}
```

**Business Rules:**
- `PARENT_OF`: Parent must be from user's family
- `SPOUSE_OF`: At least one spouse must be from user's family (enables cross-family marriages)

---

#### `DELETE /tree/edges/:id`
Delete a relationship. **Requires ADMIN role.**

---

#### `GET /tree/graph`
Get full graph data for visualization.

**Query Parameters:**
- `familyId` (optional) - Filter by family
- `city` (optional) - Filter by city

**Response:**
```json
{
  "nodes": [
    {
      "id": "uuid",
      "label": "Mohamed Ben Ali",
      "family_id": "uuid",
      "family_name": "Ben Ali",
      "current_city": "Tunis",
      "canEdit": true
    }
  ],
  "edges": [
    {
      "id": "uuid",
      "from": "uuid",
      "to": "uuid",
      "type": "PARENT_OF",
      "canEdit": true
    }
  ]
}
```

---

### Families

#### `GET /families`
Get all families with member counts.

**Response:**
```json
[
  {
    "family_id": "uuid",
    "family_name": "Ben Ali",
    "member_count": 8
  }
]
```

---

## 🗄️ Database Schema

### Tables

#### `families`
```sql
id          UUID PRIMARY KEY
name        TEXT UNIQUE NOT NULL
created_at  TIMESTAMPTZ
```

#### `users`
```sql
id          UUID PRIMARY KEY
email       TEXT UNIQUE NOT NULL
password    TEXT NOT NULL (bcrypt hashed)
role        TEXT (ADMIN, EDITOR, VIEWER)
family_id   UUID REFERENCES families
first_name  TEXT
last_name   TEXT
current_city TEXT
```

#### `people`
```sql
id           UUID PRIMARY KEY
family_id    UUID REFERENCES families
first_name   TEXT NOT NULL
last_name_raw TEXT
surname_id   UUID REFERENCES surnames
region_id    UUID REFERENCES regions
expertise_id UUID REFERENCES expertise_fields
current_city TEXT
```

#### `family_tree_edges`
```sql
id             UUID PRIMARY KEY
family_id      UUID REFERENCES families
from_person_id UUID REFERENCES people
to_person_id   UUID REFERENCES people
type           TEXT (PARENT_OF, SPOUSE_OF)
```

**Constraints:**
- Unique edge per relationship (except SPOUSE_OF can be cross-family)
- Cascade delete on person removal

---

## 🎨 Graph Visualization

The graph page (`/graph`) features an **Obsidian-style** force-directed visualization:

### Physics Simulation
- **Repulsion**: Nodes push away from each other
- **Edge Attraction**: Connected nodes are drawn together
- **Family Clustering**: Same-family members gravitate toward each other
- **Center Gravity**: Keeps the graph centered

### Interactions
| Action | Effect |
|--------|--------|
| **Drag node** | Move individual nodes |
| **Drag background** | Pan the view |
| **Mouse wheel** | Zoom in/out (toward cursor) |
| **Hover node** | Highlight connections, show glow |
| **Click node** | Show details panel |
| **Click ⚡ button** | Reheat simulation |
| **Click ⟲ button** | Reset view |

### Visual Features
- Color-coded families (15 distinct colors)
- Solid lines = Parent-Child relationships
- Dashed pink lines = Spouse relationships
- Glow effect on hover
- Glass-effect node highlights
- Subtle grid background

---

## 🔧 Environment Variables

### Server (`server/.env`)

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tun_family_dev
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=4000
CORS_ORIGIN=http://localhost:5173
```

### Client

The client uses `http://localhost:4000` as the API base URL (configured in `apiClient.js`).

---

## 🧪 Sample Data

The schema includes seed data with:
- **14 families** (Ben Ali, Trabelsi, Bouzid, Mansouri, etc.)
- **94 people** with Tunisian names
- **129 relationships** (parent-child and spouse)
- **12 cities** (Tunis, Sfax, Sousse, Kairouan, etc.)
- **9 cross-family marriages**

---

## 🛠️ Development

### Run in Development Mode

**Server:**
```bash
cd server && npm run dev
```

**Client:**
```bash
cd client && npm run dev
```

### Build for Production

**Client:**
```bash
cd client && npm run build
# Output in client/dist/
```

**Server:**
```bash
cd server && npm start
```

---

## 📝 License

MIT License - feel free to use this project for learning or as a base for your own applications.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- Inspired by [Obsidian](https://obsidian.md/) graph view
- Built with React, Express, and PostgreSQL
- UI inspired by modern glassmorphism design trends

---

Made with ❤️ for Tunisian families
