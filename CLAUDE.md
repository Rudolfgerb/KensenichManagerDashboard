# KensenichManager - Vollständige Projekt-Dokumentation

> **AI-gestützter persönlicher Business-Assistent für Produktivität, Projektmanagement und Zielerreichung**

**Formerly known as:** BratanDrillManager

---

## 📋 Inhaltsverzeichnis

1. [Projekt-Übersicht](#projekt-übersicht)
2. [Installation & Setup](#installation--setup)
3. [Architektur](#architektur)
4. [Features & Module](#features--module)
5. [API-Dokumentation](#api-dokumentation)
6. [Datenbank-Schema](#datenbank-schema)
7. [Frontend-Komponenten](#frontend-komponenten)
8. [AI-Integration](#ai-integration)
9. [Entwicklung](#entwicklung)
10. [Deployment](#deployment)
11. [Roadmap](#roadmap)

---

## 📖 Projekt-Übersicht

### Vision
KensenichManager ist ein intelligenter persönlicher Assistent, der als zentrales Hub für:
- **Produktivität** (Pomodoro Timer, Task Management)
- **Business Management** (CRM, Kommunikation, Sales Pipeline)
- **Projekt-Management** (Multi-Projekt Branding Board mit PRDs & Assets)
- **Content Creation** (Content Plan mit Element-Tracking)
- **Analytics** (KPIs von Google Analytics, Social Media, Email)
- **Karriere** (Job Search Tracking)
- **Ziele** (Goal Setting & Tracking)
- **Entwicklung** (Terminal, File Management)

fungiert.

### Technologie
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express
- **Datenbank**: SQLite
- **AI**: Google Gemini Pro ODER Ollama (lokal)
- **Styling**: Custom CSS mit Neon-Green Theme
- **Speech**: Web Speech API
- **Analytics**: Integration-ready für Google Analytics, Social Media APIs

### Zielgruppe
- Gründer & Entrepreneurs
- Product Manager & Scrum Master
- Freelancer & Remote Worker
- Entwickler mit Business-Ambitionen

---

## 🚀 Installation & Setup

### Voraussetzungen
```bash
- Node.js >= 18.x
- npm >= 9.x
- Google Gemini API Key
```

### Installation

1. **Repository klonen / Ordner öffnen**
```bash
cd /home/pi2/Desktop/bratanasisstent
```

2. **Backend Setup**
```bash
cd backend
npm install

# .env Datei erstellen
cp .env.example .env
# Gemini API Key eintragen:
# GEMINI_API_KEY=AIzaSyDnzN980k4vBEFmjOWiwHCMV61lSaVLgg4
```

3. **Frontend Setup**
```bash
cd ../frontend
npm install
```

### Start

**Methode 1: Start-Script**
```bash
chmod +x start.sh
./start.sh
```

**Methode 2: Manual**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

---

## 🏗️ Architektur

### Ordnerstruktur
```
bratanasisstent/
├── backend/                    # Node.js Express Server
│   ├── src/
│   │   ├── server.js          # Main Server Entry
│   │   ├── db.js              # Database Setup & Schema
│   │   └── routes/            # API Routes
│   │       ├── tasks.js       # Task Management
│   │       ├── sessions.js    # Work Sessions
│   │       ├── ai.js          # AI Chat & Services
│   │       ├── crm.js         # CRM System
│   │       ├── goals.js       # Goal Tracking
│   │       ├── terminal.js    # Terminal API
│   │       ├── sops.js        # SOPs
│   │       └── pages.js       # Workspace Pages
│   ├── data/                  # SQLite Database
│   └── package.json
│
├── frontend/                   # React TypeScript App
│   ├── src/
│   │   ├── main.tsx           # App Entry
│   │   ├── App.tsx            # Main App Component
│   │   ├── App.css            # Global Styles
│   │   ├── types/             # TypeScript Types
│   │   ├── services/          # API Services
│   │   │   └── api.ts         # Axios API Client
│   │   └── components/        # React Components
│   │       ├── Dashboard/     # Main Dashboard
│   │       ├── AIAssistant/   # Bratan AI Chatbot
│   │       ├── TaskTimer/     # Pomodoro Timer
│   │       ├── TaskDocumentation/
│   │       ├── FileManager/   # File Browser
│   │       ├── CRM/           # Customer Relations
│   │       ├── GoalTracker/   # Goal Management
│   │       ├── BrandingBoard/ # Assets & Templates
│   │       └── Terminal/      # Terminal Interface
│   ├── index.html
│   └── package.json
│
├── shared/                     # Shared Code
├── start.sh                    # Start Script
├── README.md                   # Project README
├── FEATURES.md                 # Feature List
└── CLAUDE.md                   # Diese Datei
```

### Tech Stack Details

#### Backend
- **Framework**: Express.js 4.x
- **Database**: SQLite3 (via sqlite3 package)
- **AI**: @google/generative-ai (Gemini)
- **Security**: CORS, Input Validation
- **Dev**: Nodemon (Hot Reload)

#### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5.x
- **Routing**: React Router DOM 6.x
- **HTTP Client**: Axios
- **State**: React Hooks (useState, useEffect)
- **Styling**: Custom CSS (no framework)

---

## ✨ Features & Module

### 1. **Dashboard** ✅ Implementiert
**Path**: `/`

**Features**:
- Statistik-Cards (Sessions, Zeit, Fortschritt)
- Start-Button für 30-Min Pomodoro Sessions
- Letzte Sessions Timeline
- Schnellzugriff auf alle Module

**Komponenten**:
- `Dashboard.tsx` - Haupt-Dashboard
- `Dashboard.css` - Futuristisches Styling

---

### 2. **AI Assistent "Bratan"** ✅ Implementiert
**Path**: Floating Widget (immer verfügbar)

**Features**:
- 🤖 Animierter Roboter-Avatar
- 💬 Chat-Interface mit Google Gemini
- 🎤 Spracheingabe (Web Speech API)
- 🔊 Text-to-Speech Ausgabe
- 💾 Persistente Chat-Historie
- 🎯 Kontextbewusstes Coaching
- ⚡ Auto-Begrüßung beim ersten Besuch

**Verwendung**:
```javascript
// Chat-Beispiele
"Bratan, was steht heute an?"
"Zeig mir meine Mutuus Milestones"
"Erstelle ein Meeting-Protokoll"
"Wie viele Bewerbungen habe ich diese Woche?"
```

**API**:
- `POST /api/ai/chat` - Chat mit Gemini
- `POST /api/ai/summarize-session` - Session zusammenfassen
- `POST /api/ai/analyze-productivity` - Produktivität analysieren
- `POST /api/ai/generate-sop` - SOP generieren

---

### 3. **Pomodoro Timer** ✅ Implementiert
**Path**: Über Dashboard "Start" Button

**Features**:
- ⏱️ 30-Minuten Countdown
- 📊 Visueller Circle Progress
- 🎯 Task-Auswahl vor Session
- 📝 Dokumentation nach Session
- 💾 Auto-Speicherung in DB
- 📈 Session-Statistiken

**Flow**:
1. "Start" klicken
2. Task auswählen (oder neu erstellen)
3. Timer läuft (30 Min)
4. "Fertig" klicken
5. Dokumentation eingeben
6. Session wird gespeichert

**API**:
- `POST /api/sessions/start` - Session starten
- `POST /api/sessions/:id/complete` - Session abschließen
- `POST /api/sessions/:id/stop` - Session stoppen
- `GET /api/sessions/current` - Aktuelle Session
- `GET /api/sessions/stats` - Statistiken

---

### 4. **Task Management** ✅ Implementiert
**Path**: `/tasks` (geplant)

**Features**:
- ✅ Task CRUD (Create, Read, Update, Delete)
- 🏷️ Kategorien & Tags
- ⭐ Prioritäten (0-5)
- 📅 Due Dates
- 📊 Geschätzte Sessions
- 🔄 Status Tracking (todo, in_progress, completed)

**API**:
- `GET /api/tasks` - Alle Tasks
- `GET /api/tasks/pending` - Offene Tasks
- `POST /api/tasks` - Task erstellen
- `PUT /api/tasks/:id` - Task aktualisieren
- `DELETE /api/tasks/:id` - Task löschen

---

### 5. **CRM System** ⚙️ Backend fertig
**Path**: `/crm` (Frontend TODO)

**Features**:
- 👥 Kontaktverwaltung (Kunden, Partner, Leads)
- 📧 Kommunikations-Log (Email, Call, Meeting)
- 📅 Follow-up Reminders
- 🏷️ Tagging System
- 📊 Kontakt-Historie
- 🔔 Überfällige Follow-ups

**Datenmodell**:
```typescript
interface Contact {
  id: string;
  name: string;
  type: 'client' | 'partner' | 'lead';
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  last_contact?: Date;
  next_followup?: Date;
  tags?: string[];
}

interface Communication {
  id: string;
  contact_id: string;
  type: 'email' | 'call' | 'meeting' | 'message';
  subject?: string;
  content?: string;
  direction: 'incoming' | 'outgoing';
  status: 'sent' | 'received' | 'scheduled';
  sent_at?: Date;
}
```

**API**:
- `GET /api/crm/contacts` - Alle Kontakte
- `GET /api/crm/contacts/:id` - Kontakt + Historie
- `POST /api/crm/contacts` - Kontakt erstellen
- `PUT /api/crm/contacts/:id` - Kontakt aktualisieren
- `POST /api/crm/contacts/:id/communication` - Kommunikation loggen
- `GET /api/crm/followups` - Überfällige Follow-ups

---

### 6. **Goal Tracking** ⚙️ Backend fertig
**Path**: `/goals` (Frontend TODO)

**Features**:
- 🎯 Ziel-Definition (SMART Goals)
- 📈 Progress Tracking (0-100%)
- 📅 Target Dates
- 🏷️ Kategorien (business, career, personal, health)
- 📊 Metrics & KPIs
- ✅ Status (active, completed, paused, abandoned)

**Datenmodell**:
```typescript
interface Goal {
  id: string;
  title: string;
  description?: string;
  category?: string;
  target_date?: Date;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  progress: number; // 0-100
  metrics?: string; // JSON
}
```

**API**:
- `GET /api/goals` - Alle Ziele
- `GET /api/goals?status=active` - Aktive Ziele
- `POST /api/goals` - Ziel erstellen
- `PUT /api/goals/:id` - Ziel aktualisieren
- `GET /api/goals/stats/overview` - Statistiken

---

### 7. **File Manager** ✅ Implementiert (Frontend)
**Path**: `/files` (geplant)

**Features**:
- 📁 Desktop-Dateien browsen
- 🔍 Datei-Suche
- 📊 Grid & List View
- 📄 Datei-Vorschau
- ⭐ Favoriten
- 🏷️ Quick Links

**Komponenten**:
- `FileManager.tsx`
- `FileManager.css`

---

### 8. **Terminal** ⚙️ Backend fertig
**Path**: `/terminal` (Frontend TODO)

**Features**:
- 💻 CLI Commands ausführen
- 📁 Desktop-Zugriff
- 🔐 Whitelist-basierte Security
- 📜 Command History
- 🤖 Claude CLI Integration
- 🤖 Gemini CLI Integration

**Erlaubte Commands**:
- `ls`, `pwd`, `cat`, `echo`
- `claude` (Claude CLI)
- `gemini` (Gemini CLI)
- `npm`, `node`, `git`

**API**:
- `POST /api/terminal/execute` - Command ausführen
- `GET /api/terminal/files` - Dateien listen
- `GET /api/terminal/files/read` - Datei lesen
- `POST /api/terminal/files/write` - Datei schreiben
- `GET /api/terminal/cwd` - Working Directory

**Beispiele**:
```bash
# Via API
POST /api/terminal/execute
{
  "command": "ls -la",
  "cwd": "/home/pi2/Desktop"
}

# Response
{
  "success": true,
  "stdout": "total 48\ndrwxr-xr-x ...",
  "stderr": "",
  "cwd": "/home/pi2/Desktop"
}
```

---

### 9. **Branding Board** ✅ Implementiert
**Path**: `/branding`

**Features**:
- 📁 **Multi-Projekt-Management** - Verwalte mehrere Projekte parallel
- 🎨 **Branding Assets** - Logos, Farbpaletten, Typography, Icons per Projekt
- 📄 **Projekt-Dokumente** - PRD, Pitch Deck, Business Plan, Roadmaps
- 🎯 **Milestones** - Projekt-Milestones mit Progress-Tracking
- 🔄 **Projekt-Switcher** - Schnell zwischen Projekten wechseln
- 📊 **Projekt-Stats** - Übersicht über Assets, Docs und Milestones

**Datenmodell**:
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  color?: string;
  icon?: string;
  start_date?: string;
  target_launch_date?: string;
  actual_launch_date?: string;
  website_url?: string;
  repository_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface BrandingAsset {
  id: string;
  project_id: string;
  asset_type: 'logo' | 'color_palette' | 'typography' | 'icon' |
                'image' | 'video' | 'template' | 'other';
  title: string;
  description?: string;
  file_url?: string;
  version: string;
  is_primary: number;
}

interface ProjectDocument {
  id: string;
  project_id: string;
  document_type: 'prd' | 'pitch_deck' | 'business_plan' |
                  'roadmap' | 'design_spec' | 'other';
  title: string;
  content?: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  version: string;
}

interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  target_date?: string;
  completed_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  priority: number;
}
```

**API**:
```javascript
// Projects
GET    /api/projects              - Alle Projekte
GET    /api/projects/:id          - Einzelnes Projekt mit Details
POST   /api/projects              - Projekt erstellen
PUT    /api/projects/:id          - Projekt aktualisieren
DELETE /api/projects/:id          - Projekt löschen
GET    /api/projects/:id/stats    - Projekt-Statistiken

// Assets
GET    /api/projects/:id/assets                  - Alle Assets
POST   /api/projects/:id/assets                  - Asset hinzufügen
PUT    /api/projects/:pid/assets/:aid            - Asset aktualisieren
DELETE /api/projects/:pid/assets/:aid            - Asset löschen

// Documents
GET    /api/projects/:id/documents               - Alle Dokumente
POST   /api/projects/:id/documents               - Dokument erstellen
PUT    /api/projects/:pid/documents/:did         - Dokument aktualisieren
DELETE /api/projects/:pid/documents/:did         - Dokument löschen

// Milestones
GET    /api/projects/:id/milestones              - Alle Milestones
POST   /api/projects/:id/milestones              - Milestone erstellen
PUT    /api/projects/:pid/milestones/:mid        - Milestone aktualisieren
DELETE /api/projects/:pid/milestones/:mid        - Milestone löschen
```

**Verwendung**:
```javascript
// Projekt erstellen
POST /api/projects
{
  "name": "Mutuus App",
  "description": "Mental Health & Productivity App",
  "icon": "🚀",
  "color": "#00ff88",
  "status": "active",
  "website_url": "https://mutuus.app"
}

// Asset hinzufügen
POST /api/projects/{project_id}/assets
{
  "asset_type": "logo",
  "title": "Primary Logo",
  "description": "Main brand logo with tagline",
  "file_url": "https://...",
  "version": "2.0",
  "is_primary": 1
}

// PRD erstellen
POST /api/projects/{project_id}/documents
{
  "document_type": "prd",
  "title": "Mutuus MVP Requirements",
  "content": "## Features\n1. User Auth\n2. Dashboard...",
  "status": "approved",
  "version": "1.0"
}
```

**Komponenten**:
- `BrandingBoard.tsx` - Haupt-Komponente mit Projekt-Management
- `BrandingBoard.css` - Futuristisches Styling
- `types/index.ts` - TypeScript Interfaces

---

### 10. **Job Search Tracker** 📋 Tabelle existiert
**Path**: `/jobs` (TODO)

**Datenmodell**:
```typescript
interface JobApplication {
  id: string;
  company: string;
  position: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected';
  applied_date?: Date;
  interview_date?: Date;
  notes?: string;
  salary_range?: string;
  job_url?: string;
  contact_person?: string;
}
```

---

### 11. **Mutuus Launch Manager** 📋 Tabelle existiert
**Path**: `/mutuus` (TODO)

**Datenmodell**:
```typescript
interface MutuusMilestone {
  id: string;
  title: string;
  description?: string;
  target_date?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  progress: number; // 0-100
  dependencies?: string[]; // IDs
}
```

---

## 📡 API-Dokumentation

### Base URL
```
http://localhost:3001/api
```

### Authentication
Aktuell: **Keine Authentication** (Personal Use Only)
Geplant: JWT-basiert für Multi-User

### Endpoints Overview

#### Tasks
```
GET    /tasks              - Alle Tasks
GET    /tasks/pending      - Offene Tasks
GET    /tasks/:id          - Einzelner Task
POST   /tasks              - Task erstellen
PUT    /tasks/:id          - Task aktualisieren
DELETE /tasks/:id          - Task löschen
```

#### Sessions
```
GET    /sessions           - Alle Sessions
GET    /sessions/stats     - Statistiken
GET    /sessions/current   - Laufende Session
POST   /sessions/start     - Session starten
POST   /sessions/:id/complete - Session abschließen
POST   /sessions/:id/stop  - Session stoppen
```

#### AI
```
POST   /ai/chat                  - Chat mit Gemini
POST   /ai/summarize-session     - Session zusammenfassen
POST   /ai/analyze-productivity  - Produktivität analysieren
POST   /ai/generate-sop          - SOP generieren
```

#### CRM
```
GET    /crm/contacts             - Alle Kontakte
GET    /crm/contacts/:id         - Kontakt + Historie
POST   /crm/contacts             - Kontakt erstellen
PUT    /crm/contacts/:id         - Kontakt aktualisieren
DELETE /crm/contacts/:id         - Kontakt löschen
POST   /crm/contacts/:id/communication - Kommunikation loggen
GET    /crm/followups            - Überfällige Follow-ups
```

#### Goals
```
GET    /goals                - Alle Ziele
GET    /goals?status=active  - Gefilterte Ziele
GET    /goals/:id            - Einzelnes Ziel
POST   /goals                - Ziel erstellen
PUT    /goals/:id            - Ziel aktualisieren
DELETE /goals/:id            - Ziel löschen
GET    /goals/stats/overview - Statistiken
```

#### Terminal
```
POST   /terminal/execute         - Command ausführen
GET    /terminal/files           - Dateien listen
GET    /terminal/files/read      - Datei lesen
POST   /terminal/files/write     - Datei schreiben
GET    /terminal/cwd             - Working Directory
```

### Request/Response Beispiele

#### Task erstellen
```javascript
// Request
POST /api/tasks
{
  "title": "Mutuus Landing Page designen",
  "description": "Wireframes + Design System",
  "priority": 5,
  "category": "mutuus",
  "estimated_sessions": 4,
  "due_date": "2025-01-15"
}

// Response
{
  "id": "uuid-123",
  "title": "Mutuus Landing Page designen",
  "status": "todo",
  "priority": 5,
  "created_at": "2025-12-31T12:00:00Z",
  ...
}
```

#### Session starten
```javascript
// Request
POST /api/sessions/start
{
  "task_id": "uuid-123"
}

// Response
{
  "id": "session-456",
  "task_id": "uuid-123",
  "task_title": "Mutuus Landing Page designen",
  "started_at": "2025-12-31T12:00:00Z",
  "status": "running",
  "duration_minutes": 30
}
```

#### AI Chat
```javascript
// Request
POST /api/ai/chat
{
  "messages": [
    { "role": "user", "content": "Was steht heute an?" }
  ],
  "context": {
    "current_task": "uuid-123",
    "active_sessions": 2
  }
}

// Response
{
  "message": "Heute hast du 3 Tasks geplant: Mutuus Landing Page, Bewerbung bei Firma X, und Sprint Planning. Am besten startest du mit der Landing Page!"
}
```

---

## 🗄️ Datenbank-Schema

### SQLite Tabellen

#### tasks
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority INTEGER DEFAULT 0,
  estimated_sessions INTEGER DEFAULT 1,
  category TEXT DEFAULT 'general',
  tags TEXT,
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### work_sessions
```sql
CREATE TABLE work_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'running',
  documentation TEXT,
  ai_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

#### crm_contacts
```sql
CREATE TABLE crm_contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'client',
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  last_contact DATETIME,
  next_followup DATETIME,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### communication_log
```sql
CREATE TABLE communication_log (
  id TEXT PRIMARY KEY,
  contact_id TEXT,
  type TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  direction TEXT DEFAULT 'outgoing',
  status TEXT DEFAULT 'sent',
  scheduled_at DATETIME,
  sent_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL
);
```

#### goals
```sql
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  target_date DATETIME,
  status TEXT DEFAULT 'active',
  progress INTEGER DEFAULT 0,
  metrics TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### job_applications
```sql
CREATE TABLE job_applications (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  status TEXT DEFAULT 'applied',
  applied_date DATETIME,
  interview_date DATETIME,
  notes TEXT,
  salary_range TEXT,
  job_url TEXT,
  contact_person TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### mutuus_milestones
```sql
CREATE TABLE mutuus_milestones (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATETIME,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  dependencies TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Datenbank Location
```
/home/pi2/Desktop/bratanasisstent/backend/data/bratandrillmanager.db
```

---

## 🎨 Frontend-Komponenten

### Design System

#### Farben
```css
:root {
  --neon-green: #00ff88;
  --neon-green-glow: rgba(0, 255, 136, 0.5);
  --dark-bg: #0a0a0a;
  --dark-card: #1a1a1a;
  --dark-border: #333;
}
```

#### Typografie
- Font: Inter, -apple-system, BlinkMacSystemFont
- Headings: 900 weight, uppercase, letter-spacing
- Text: 400-600 weight

#### Animationen
- `fadeIn` - Einblenden
- `slideUp` - Von unten einsliden
- `pulse` - Pulsieren
- `glow` - Neon-Glow Effekt
- `float` - Schweben
- `gradientShift` - Gradient-Animation

### Komponenten-Hierarchie
```
App
├── Header (Navigation)
├── Main
│   ├── Dashboard (/)
│   ├── Sessions (/sessions)
│   ├── SOPs (/sops)
│   └── Workspace (/workspace)
└── AIAssistant (Floating Widget)
```

---

## 🤖 AI-Integration

### Flexible AI Provider (Gemini ODER Ollama)

Das System unterstützt jetzt zwei AI-Provider:
- **Google Gemini Pro** (Cloud-basiert, benötigt API Key)
- **Ollama** (Lokal, Privacy-First, kostenlos)

#### Konfiguration

**Environment Variables** (`backend/.env`):
```bash
# AI Provider wählen: 'gemini' oder 'ollama'
AI_PROVIDER=gemini

# Google Gemini Konfiguration
GEMINI_API_KEY=your_api_key_here

# Ollama Konfiguration
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

#### Ollama Setup (empfohlen für Privacy)

1. **Installiere Ollama**: https://ollama.ai
2. **Downloade ein Modell**:
   ```bash
   # Standard Modell
   ollama pull llama2

   # Oder andere Modelle:
   ollama pull mistral        # Schnell & effizient
   ollama pull codellama      # Für Code-Generation
   ollama pull llama2:70b     # Sehr leistungsfähig
   ollama pull phi            # Klein & schnell
   ```
3. **Starte Ollama**:
   ```bash
   ollama serve
   ```
4. **Konfiguriere Backend**:
   ```bash
   # In backend/.env
   AI_PROVIDER=ollama
   OLLAMA_MODEL=llama2
   ```
5. **Backend neu starten**

#### API Verwendung

**Alle AI-Funktionen arbeiten transparent mit beiden Providern:**

**Chat** (`POST /api/ai/chat`):
```javascript
const response = await axios.post('http://localhost:3001/api/ai/chat', {
  messages: [
    { role: 'user', content: 'Was steht heute an?' }
  ],
  context: { current_task: 'task-123' }
});

// Response enthält Provider-Info
console.log(response.data.message);     // AI Response
console.log(response.data.provider);    // 'gemini' oder 'ollama'
console.log(response.data.model);       // 'gemini-pro' oder 'llama2'
```

**Session Zusammenfassung** (`POST /api/ai/summarize-session`):
```javascript
const response = await axios.post('http://localhost:3001/api/ai/summarize-session', {
  taskTitle: 'Mutuus Landing Page',
  documentation: 'Wireframes erstellt, Design System aufgesetzt...'
});
```

**SOP Generierung** (`POST /api/ai/generate-sop`):
```javascript
const response = await axios.post('http://localhost:3001/api/ai/generate-sop', {
  processName: 'Content Creation Workflow',
  sessions: [...]
});
```

**Provider Status** (`GET /api/ai/config`):
```javascript
const response = await axios.get('http://localhost:3001/api/ai/config');
console.log(response.data);
// {
//   "provider": "ollama",
//   "ollamaUrl": "http://localhost:11434",
//   "ollamaModel": "llama2",
//   "geminiConfigured": true
// }
```

**Ollama Test** (`GET /api/ai/test-ollama`):
```javascript
const response = await axios.get('http://localhost:3001/api/ai/test-ollama');
if (response.data.success) {
  console.log('Verfügbare Modelle:', response.data.models);
}
```

#### Interner Code (generateAIResponse Helper)

```javascript
async function generateAIResponse(prompt) {
  if (AI_PROVIDER === 'ollama') {
    // Ollama
    const response = await axios.post(`${OLLAMA_API_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false
    });
    return response.data.response;
  } else {
    // Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
```

#### Vorteile von Ollama

✅ **Privacy**: Daten bleiben lokal auf deinem Gerät
✅ **Kostenlos**: Keine API-Gebühren
✅ **Offline-fähig**: Funktioniert ohne Internet
✅ **Anpassbar**: Verschiedene Modelle für verschiedene Use Cases
✅ **Schnell**: Lokal = niedrige Latenz

#### Vorteile von Gemini

✅ **Cloud-basiert**: Keine lokale Hardware nötig
✅ **Leistungsfähig**: State-of-the-art Modelle
✅ **Einfach**: Kein lokales Setup nötig
✅ **Updates**: Automatisch neueste Modell-Versionen

### Web Speech API

**Speech-to-Text**:
```javascript
const recognition = new webkitSpeechRecognition();
recognition.lang = 'de-DE';
recognition.continuous = false;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  console.log(transcript);
};

recognition.start();
```

**Text-to-Speech**:
```javascript
const utterance = new SpeechSynthesisUtterance(text);
utterance.lang = 'de-DE';
utterance.rate = 1.0;
utterance.pitch = 1.0;

window.speechSynthesis.speak(utterance);
```

---

## 💻 Entwicklung

### Development Server starten
```bash
# Backend (Terminal 1)
cd backend
npm run dev
# läuft auf http://localhost:3001

# Frontend (Terminal 2)
cd frontend
npm run dev
# läuft auf http://localhost:3000
```

### Hot Reload
- **Backend**: Nodemon watched automatisch alle `.js` Files
- **Frontend**: Vite HMR (Hot Module Replacement)

### Debugging

**Backend**:
```bash
# Mit Debug Logs
DEBUG=* npm run dev

# Node Inspector
node --inspect src/server.js
```

**Frontend**:
- Browser DevTools (F12)
- React DevTools Extension
- Network Tab für API Calls

### Testing

**Backend**:
```bash
# Manual API Testing
curl http://localhost:3001/api/health

# oder Postman/Insomnia
```

**Frontend**:
```bash
# Build Test
npm run build
npm run preview
```

### Database Management

**Zugriff**:
```bash
cd backend/data
sqlite3 bratandrillmanager.db

# SQL Commands
.tables
.schema tasks
SELECT * FROM tasks;
```

**Backup**:
```bash
cp bratandrillmanager.db bratandrillmanager.db.backup
```

**Reset**:
```bash
rm bratandrillmanager.db
# Server neu starten - DB wird automatisch neu erstellt
```

---

## 🚀 Deployment

### Production Build

**Frontend**:
```bash
cd frontend
npm run build
# Output in: dist/
```

**Backend**:
```bash
cd backend
npm start
# Production mode
```

### Environment Variables

**Backend (.env)**:
```bash
NODE_ENV=production
PORT=3001
GEMINI_API_KEY=your_key_here
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Hosting Options

**Option 1: Raspberry Pi (Local)**
- Bereits auf Pi
- Zugriff via LAN: `http://192.168.x.x:3000`

**Option 2: Cloud (DigitalOcean, AWS, etc.)**
```bash
# PM2 Process Manager
npm install -g pm2

# Backend starten
cd backend
pm2 start src/server.js --name bratan-backend

# Frontend bauen & serven
cd frontend
npm run build
pm2 serve dist 3000 --name bratan-frontend
```

**Option 3: Docker**
```dockerfile
# Beispiel Dockerfile (TODO)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

---

## 🗺️ Roadmap

### Phase 1: MVP ✅ **AKTUELL**
- [x] Dashboard
- [x] Pomodoro Timer
- [x] Task Management
- [x] AI Assistant mit Roboter-Avatar
- [x] Dateimanager (Frontend)
- [x] Database Setup (alle Tabellen)
- [x] API Routes (CRM, Goals, Terminal)

### Phase 2: Business Features 🔨 **IN PROGRESS**
- [ ] CRM Frontend
- [ ] Goal Tracker Frontend
- [ ] Terminal Frontend
- [ ] Branding Board
- [ ] Job Search Tracker
- [ ] Mutuus Launch Dashboard

### Phase 3: Automation 📅 **GEPLANT**
- [ ] Auto Follow-ups (CRM)
- [ ] Smart Scheduling
- [ ] AI Task Priorisierung
- [ ] Email Integration (Gmail)
- [ ] Calendar Integration (Google Calendar)
- [ ] Batch Operations

### Phase 4: Advanced 🔮 **FUTURE**
- [ ] Mobile App (React Native)
- [ ] Team Features (Multi-User)
- [ ] API für Third-Party
- [ ] Plugins System
- [ ] Analytics Dashboard
- [ ] Notifications System

---

## 📝 Code-Konventionen

### TypeScript
```typescript
// Interface naming: PascalCase
interface Task {
  id: string;
  title: string;
}

// Function naming: camelCase
const createTask = (data: TaskData) => { ... }

// Component naming: PascalCase
export default function Dashboard() { ... }
```

### CSS
```css
/* BEM-ähnlich */
.component-name { }
.component-name__element { }
.component-name--modifier { }

/* States */
.component.is-active { }
.component.is-loading { }
```

### Git Commits
```bash
# Format
<type>: <subject>

# Typen
feat: Neues Feature
fix: Bugfix
docs: Dokumentation
style: Formatierung
refactor: Code-Refactoring
test: Tests
chore: Maintenance
```

---

## 🐛 Troubleshooting

### Backend startet nicht
```bash
# Port belegt?
lsof -i :3001
kill -9 <PID>

# Dependencies fehlen?
rm -rf node_modules
npm install

# Database Error?
rm backend/data/bratandrillmanager.db
# Server neu starten
```

### Frontend startet nicht
```bash
# Port belegt?
lsof -i :3000
kill -9 <PID>

# Vite Error?
rm -rf node_modules .vite
npm install
```

### AI funktioniert nicht
```bash
# API Key prüfen
cat backend/.env | grep GEMINI

# API Rate Limit?
# Warten oder neuen Key holen
```

### Database Lock Error
```bash
# SQLite Timeout
# Alle Connections schließen
pkill -f "node.*server.js"
# Neu starten
```

---

## 📞 Support & Kontakt

### Entwickler
- **Name**: BratanDrillManager Team
- **Location**: /home/pi2/Desktop/bratanasisstent

### Logs
```bash
# Backend Logs
cd backend
npm run dev
# Output in Console

# Frontend Logs
# Browser Console (F12)
```

### Dokumentation aktualisieren
Diese Datei editieren:
```bash
nano /home/pi2/Desktop/bratanasisstent/CLAUDE.md
```

---

## 🎯 Quick Start Guide

**Für neue Entwickler:**

1. Projekt verstehen: Lies [Projekt-Übersicht](#projekt-übersicht)
2. Setup: Folge [Installation & Setup](#installation--setup)
3. Architektur: Schau dir [Architektur](#architektur) an
4. Start: Nutze `./start.sh`
5. Entwickeln: Ändere Code, HMR macht den Rest
6. API testen: Nutze [API-Dokumentation](#api-dokumentation)
7. Deployen: Siehe [Deployment](#deployment)

**Für Benutzer:**

1. `./start.sh` ausführen
2. Browser öffnen: http://localhost:3000
3. Roboter-Avatar anklicken → Chat mit Bratan
4. "Start" Button → Pomodoro Session starten
5. Tasks verwalten, Ziele tracken, produktiv sein!

---

## 📄 Lizenz

Personal Use Only - Kein Open Source (noch)

---

**Version**: 1.0.0
**Letztes Update**: 2025-12-31
**Status**: Beta / In Development

---

*Diese Dokumentation ist dynamisch und wird kontinuierlich aktualisiert.*
