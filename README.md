# 💀🔮 KensenichManager

> **AI-gestützter persönlicher Business-Assistent für Produktivität, Projektmanagement und Zielerreichung**

Formerly known as: BratanDrillManager

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?logo=sqlite&logoColor=white)](https://www.sqlite.org/)

---

## 🚀 Quick Start

```bash
# Clone & Install
cd /home/pi2/Desktop/bratanasisstent

# Option 1: Automatic Start (Recommended)
chmod +x start.sh
./start.sh

# Option 2: Manual Start
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

**URLs**:
- 🌐 Frontend: http://localhost:3000
- 📡 Backend: http://localhost:3001
- 🔧 Health Check: http://localhost:3001/api/health

---

## ✨ Features

### Core Modules
- ✅ **Dashboard** - Statistiken, Aktivitäten & Quick Access
- ✅ **Pomodoro Timer** - 30-Min Sessions mit Task-Tracking
- ✅ **Task Management** - SMART Tasks mit Priorisierung
- ✅ **AI Assistant "Bratan"** - Google Gemini oder Ollama (lokal)
- ✅ **CRM System** - Kontakte, Kommunikation, Follow-ups
- ✅ **Goal Tracking** - Ziele setzen & verfolgen
- ✅ **Branding Board** - Multi-Projekt Assets & PRDs
- ✅ **Content Plan** - Content Ideas mit Element-Tracking
- ✅ **Sales Pipeline** - Deal Tracking & Automation
- ✅ **Job Search Tracker** - Bewerbungen verwalten
- ✅ **File Manager** - Desktop-Dateien browsen
- 🔧 **Terminal** - CLI Commands (mit Security Whitelist)

### AI Integration
- 🤖 **Google Gemini Pro** (Cloud) ODER **Ollama** (Lokal, Privacy-First)
- 🎤 **Spracheingabe** (Web Speech API)
- 🔊 **Text-to-Speech** Ausgabe
- 💾 **Persistente Chat-Historie**
- 🎯 **Kontextbewusstes Coaching**

---

## 🏗️ Tech Stack

### Backend
- **Framework**: Express.js 4.x
- **Database**: SQLite3 mit optimierten Indexes
- **AI**: Google Gemini Pro / Ollama
- **Validation**: express-validator
- **Architecture**: CRUD Factory Pattern, Middleware-basiert

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5.x
- **Routing**: React Router DOM 6.x
- **HTTP Client**: Axios (typisiert)
- **State**: React Hooks + Custom Hooks
- **Styling**: Custom CSS (Neon-Green Theme)

### DevOps
- **Hot Reload**: Nodemon (Backend), Vite HMR (Frontend)
- **Process Management**: PM2-ready
- **Logging**: Custom Logger (Winston-ready)

---

## 📁 Projekt-Struktur

```
bratanasisstent/
├── backend/
│   ├── src/
│   │   ├── middleware/           # Error Handling, Validation
│   │   ├── utils/                # CRUD Factory, Logger, Dates
│   │   ├── routes/               # API Routes (16 Module)
│   │   ├── db.js                 # Database + Schema
│   │   ├── db-indexes.js         # Performance Indexes
│   │   └── server.js             # Express App
│   ├── data/                     # SQLite Database
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/           # React Components
│   │   ├── hooks/                # Custom Hooks (useAPI)
│   │   ├── services/             # API Service Layer
│   │   ├── types/                # TypeScript Definitions
│   │   ├── App.tsx               # Main App
│   │   └── main.tsx              # Entry Point
│   └── package.json
├── CLAUDE.md                     # Vollständige Dokumentation
├── REFACTORING.md                # Refactoring Guide
├── FEATURES.md                   # Feature-Liste
├── README.md                     # This file
└── start.sh                      # Start Script
```

---

## 🔧 Installation

### Voraussetzungen
- Node.js >= 18.x
- npm >= 9.x
- (Optional) Ollama für lokale AI

### Backend Setup
```bash
cd backend
npm install

# .env Datei erstellen
cp .env.example .env

# Gemini API Key eintragen (oder AI_PROVIDER=ollama für lokal)
# GEMINI_API_KEY=your_key_here
# AI_PROVIDER=gemini  # oder 'ollama'
```

### Frontend Setup
```bash
cd frontend
npm install
```

### Ollama Setup (Optional, für Privacy)
```bash
# Installiere Ollama: https://ollama.ai
ollama pull llama2  # oder mistral, codellama, phi

# In backend/.env:
AI_PROVIDER=ollama
OLLAMA_MODEL=llama2
```

---

## 📖 Dokumentation

- **[CLAUDE.md](./CLAUDE.md)** - Vollständige Projekt-Dokumentation (Architektur, API, Features)
- **[REFACTORING.md](./REFACTORING.md)** - Code-Qualität & Best Practices
- **[FEATURES.md](./FEATURES.md)** - Feature-Matrix

---

## 🎨 Highlights

### Code-Qualität
- ✅ **Type Safety**: Vollständig typisiert (kein `any`)
- ✅ **Error Handling**: Zentralisiertes Error Middleware
- ✅ **Input Validation**: express-validator auf allen Endpoints
- ✅ **CRUD Factory**: DRY Pattern für Routes (~70% weniger Code)
- ✅ **Custom Hooks**: Reusable Data Fetching Logic
- ✅ **Performance**: 35+ Database Indexes

### Developer Experience
- ✅ **Hot Reload** auf Backend & Frontend
- ✅ **Structured Logging** mit Timestamps
- ✅ **API Type Definitions** für IDE Autocomplete
- ✅ **Modular Architecture** - leicht erweiterbar
- ✅ **Comprehensive Documentation**

---

## 🚧 Roadmap

### Phase 1: MVP ✅ **COMPLETED**
- [x] Dashboard & Pomodoro Timer
- [x] Task Management & Sessions
- [x] AI Assistant mit Sprache
- [x] Datenbank-Schema (alle Tabellen)
- [x] API Routes (alle Module)
- [x] Refactoring & Code-Qualität

### Phase 2: Business Features 🔨 **IN PROGRESS**
- [ ] CRM Frontend (Backend fertig)
- [ ] Goal Tracker Frontend (Backend fertig)
- [ ] Terminal Frontend (Backend fertig)
- [ ] Sales Pipeline UI
- [ ] Job Tracker UI

### Phase 3: Automation 📅 **GEPLANT**
- [ ] Auto Follow-ups
- [ ] Email Integration (Gmail API)
- [ ] Calendar Sync (Google Calendar)
- [ ] Smart Notifications

### Phase 4: Advanced 🔮 **FUTURE**
- [ ] Mobile App (React Native)
- [ ] Team Features (Multi-User)
- [ ] Analytics Dashboard
- [ ] PWA Support

---

## 📊 Statistiken

- **Lines of Code**: ~15,000
- **Components**: 25+
- **API Endpoints**: 100+
- **Database Tables**: 20+
- **Type Definitions**: 50+
- **Custom Hooks**: 20+

---

## 🐛 Troubleshooting

### Backend startet nicht
```bash
# Port belegt?
lsof -i :3001
kill -9 <PID>

# Dependencies fehlen?
rm -rf node_modules package-lock.json
npm install
```

### Frontend startet nicht
```bash
# Port belegt?
lsof -i :3000
kill -9 <PID>

# Vite Cache löschen
rm -rf node_modules .vite
npm install
```

### Datenbank-Fehler
```bash
# Database neu initialisieren
cd backend/data
rm bratandrillmanager.db
# Server neu starten - DB wird automatisch erstellt
```

---

## 🤝 Contributing

Dieses Projekt ist für **Personal Use Only**. Keine Authentication implementiert.

---

## 📝 Lizenz

Personal Use Only - Kein Open Source

---

## 🙏 Acknowledgments

- React Team für React 18
- Express.js Community
- Google Gemini Team
- Ollama für lokale AI
- SQLite für embedded DB

---

**Version**: 2.0.0 (Refactored)
**Last Updated**: 31.12.2024
**Status**: Production-Ready Beta

**Made with 💀 by KensenichManager Team**
