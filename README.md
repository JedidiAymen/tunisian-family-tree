# 🇹🇳 Tunisian Family Tree

A comprehensive family tree management system built with React, TypeScript, Node.js, and PostgreSQL. Features interactive graph visualization, collaborative editing, and full administrative controls.

## ✨ Features

### Core Features
- 🌳 **Interactive Family Tree** - D3.js powered graph visualization with zoom, pan, and drag
- 👥 **Person Management** - Add, edit, delete family members with detailed profiles
- 💑 **Relationship Management** - Marriage, parent-child, and sibling relationships
- 📅 **Timeline View** - Chronological view of family events
- 🔍 **Advanced Search** - Search by name, date, location, or relationship

### Administrative Features
- 🔐 **JWT Authentication** - Secure login with role-based access control
- 👮 **Admin Dashboard** - User management, permissions, and activity monitoring
- 📝 **Change Requests** - Submit and approve/reject modifications
- 📊 **Audit Logging** - Complete history of all changes
- 👁️ **Saved Views** - Save and share custom graph configurations

### Collaboration Features
- 🤝 **Real-time Updates** - See changes as they happen
- 📈 **Progress Tracking** - Completion statistics and family insights
- 🔔 **Activity Feed** - Recent actions and notifications

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/JedidiAymen/tunisian-family-tree.git
cd tunisian-family-tree
```

2. **Setup Backend**
```bash
cd server
npm install
cp .env.example .env  # Configure your database
npm run dev
```

3. **Setup Frontend**
```bash
cd client
npm install
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

---

## 🐳 Docker Setup

```bash
docker-compose up -d
```

---

## 🔑 Test Accounts

| Email | Password | Role | Family |
|-------|----------|------|--------|
| admin@jedidi.tn | password123 | admin | Jedidi |
| admin@trabelsi.tn | password123 | admin | Trabelsi |
| admin@benali.tn | password123 | admin | Ben Ali |
| admin@bouzid.tn | password123 | admin | Bouzid |
| admin@chahed.tn | password123 | admin | Chahed |
| admin@mansouri.tn | password123 | admin | Mansouri |
| admin@ayari.tn | password123 | admin | Ayari |
| admin@hamdi.tn | password123 | admin | Hamdi |
| admin@nasri.tn | password123 | admin | Nasri |
| admin@mejri.tn | password123 | admin | Mejri |
| admin@khelifi.tn | password123 | admin | Khelifi |
| admin@sassi.tn | password123 | admin | Sassi |
| admin@gharbi.tn | password123 | admin | Gharbi |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |

### People
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/people` | List all people |
| GET | `/api/people/:id` | Get person details |
| POST | `/api/people` | Create new person |
| PUT | `/api/people/:id` | Update person |
| DELETE | `/api/people/:id` | Delete person |
| GET | `/api/people/search` | Search people |

### Relationships
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/relationships` | List relationships |
| POST | `/api/relationships` | Create relationship |
| PUT | `/api/relationships/:id` | Update relationship |
| DELETE | `/api/relationships/:id` | Delete relationship |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List all events |
| GET | `/api/events/person/:id` | Events for person |
| POST | `/api/events` | Create event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |

### Families
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/families` | List all families |
| GET | `/api/families/:id` | Get family details |
| POST | `/api/families` | Create family |
| PUT | `/api/families/:id` | Update family |

### Graph
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph` | Get graph data |
| GET | `/api/graph/tree/:id` | Get family subtree |
| PUT | `/api/graph/background` | Update background |

### Saved Views
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/saved-views` | List saved views |
| GET | `/api/saved-views/:id` | Get view details |
| POST | `/api/saved-views` | Save current view |
| DELETE | `/api/saved-views/:id` | Delete view |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| PUT | `/api/users/:id/role` | Update user role |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/audit-log` | View audit log |

### Change Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/change-requests` | List requests |
| POST | `/api/change-requests` | Submit request |
| PUT | `/api/change-requests/:id` | Approve/reject |

### Progress & Activity
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/progress` | Get completion stats |
| GET | `/api/activity` | Recent activity feed |

---

## 🗄️ Database Schema

### Core Tables

**people**
- `id`, `first_name`, `last_name`, `gender`, `birth_date`, `death_date`
- `birth_place`, `death_place`, `bio`, `photo_url`, `occupation`
- `family_id`, `created_at`, `updated_at`

**families**
- `id`, `name`, `description`, `created_at`

**family_tree_edges**
- `id`, `person_id_1`, `person_id_2`, `relationship_type`
- `start_date`, `end_date`, `created_at`

**person_events**
- `id`, `person_id`, `event_type`, `event_date`
- `location`, `description`, `created_at`

### System Tables

**users**
- `id`, `email`, `password_hash`, `first_name`, `last_name`
- `role` (admin/editor/viewer), `family_id`, `created_at`

**saved_views**
- `id`, `user_id`, `name`, `description`, `view_data`, `is_public`

**change_requests**
- `id`, `user_id`, `entity_type`, `entity_id`, `changes`
- `status` (pending/approved/rejected), `reviewed_by`

**audit_log**
- `id`, `user_id`, `action`, `entity_type`, `entity_id`
- `old_data`, `new_data`, `timestamp`

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `+` / `-` | Zoom in/out |
| `R` | Reset zoom |
| `F` | Fit to screen |
| `Esc` | Close modals |
| `Ctrl+S` | Save current view |

---

## 🎨 Graph Controls

- **Scroll** - Zoom in/out
- **Click + Drag** - Pan the view
- **Click Node** - Select person
- **Double-click Node** - Open person details
- **Right-click Node** - Context menu

---

## 📊 Current Data Statistics

| Entity | Count |
|--------|-------|
| People | 94 |
| Families | 14 |
| Relationships | 119 |
| Events | 275 |
| Users | 13 |

---

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS
- shadcn/ui components
- D3.js for graph visualization
- React Query for data fetching
- React Router

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL
- JWT Authentication
- bcrypt for password hashing

---

## 📁 Project Structure

```
tunisian-family-tree/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and API client
│   │   └── types/         # TypeScript interfaces
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, validation, etc.
│   │   └── db/            # Database connection
│   └── package.json
├── database/               # SQL schemas and seeds
├── docker-compose.yml
└── README.md
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Aymen Jedidi**
- GitHub: [@JedidiAymen](https://github.com/JedidiAymen)

---

Made with ❤️ in Tunisia 🇹🇳
