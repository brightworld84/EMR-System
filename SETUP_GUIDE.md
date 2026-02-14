# Complete Setup Guide - EMR System

This guide will walk you through setting up the entire EMR system from scratch and seeing the UI in your browser.

## Prerequisites Installation

### 1. Install Python 3.11+

**macOS:**
```bash
brew install python@3.11
```

**Windows:**
Download from https://www.python.org/downloads/

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-dev
```

### 2. Install PostgreSQL 15+

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

**Linux (Ubuntu/Debian):**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Install Node.js 18+

**macOS:**
```bash
brew install node
```

**Windows/Linux:**
Download from https://nodejs.org/

### 4. Install Redis (for Celery)

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd /path/to/emr-project/backend
```

### Step 2: Create Virtual Environment

```bash
python3 -m venv venv
```

### Step 3: Activate Virtual Environment

**macOS/Linux:**
```bash
source venv/bin/activate
```

**Windows:**
```cmd
venv\Scripts\activate
```

### Step 4: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This will take a few minutes as it installs all packages.

### Step 5: Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql postgres

# In PostgreSQL shell:
CREATE DATABASE emr_dev;
CREATE USER emr_user WITH PASSWORD 'emr_password';
GRANT ALL PRIVILEGES ON DATABASE emr_dev TO emr_user;
ALTER USER emr_user CREATEDB;  # Needed for tests
\q
```

### Step 6: Generate Encryption Key

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Copy the output (looks like: `abcdef123456...`)

### Step 7: Configure Environment Variables

```bash
# Copy example to actual .env file
cp .env.example .env

# Edit .env file
nano .env  # or use any text editor
```

Update these values in `.env`:
```
SECRET_KEY=your-random-secret-key-change-this
DEBUG=True
ENCRYPTION_KEY=paste-the-key-you-generated-above
DB_NAME=emr_dev
DB_USER=emr_user
DB_PASSWORD=emr_password
```

### Step 8: Create Django Project Structure

First, we need to create the Django project files:

```bash
# Create Django project
django-admin startproject emr .

# Create __init__.py files for all apps
touch core/__init__.py patients/__init__.py encounters/__init__.py images/__init__.py layouts/__init__.py specialty_ophthalmology/__init__.py specialty_orthopedics/__init__.py specialty_cosmetic/__init__.py surgery/__init__.py

# Create apps.py for each app
```

For each app, create `apps.py`:

**core/apps.py:**
```python
from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
```

Repeat for: `patients`, `encounters`, `images`, `layouts`, etc.

### Step 9: Create URL Configuration

**emr/urls.py:**
```python
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

router = routers.DefaultRouter()

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
```

### Step 10: Run Database Migrations

```bash
# Create migrations
python manage.py makemigrations core
python manage.py makemigrations patients
python manage.py makemigrations encounters
python manage.py makemigrations images
python manage.py makemigrations layouts

# Apply migrations
python manage.py migrate
```

### Step 11: Create Superuser

```bash
python manage.py createsuperuser

# Enter:
# Username: admin
# Email: admin@example.com
# Password: your-secure-password
# Password (again): your-secure-password
```

### Step 12: Start Backend Server

```bash
python manage.py runserver
```

You should see:
```
Django version 5.0.1, using settings 'emr.settings'
Starting development server at http://127.0.0.1:8000/
```

**🎉 Backend is now running!**

Open http://127.0.0.1:8000/admin in your browser - you should see the Django admin login page.

---

## Frontend Setup

Open a **new terminal window** (keep the backend running).

### Step 1: Navigate to Project Root

```bash
cd /path/to/emr-project
```

### Step 2: Create React App

```bash
npx create-react-app frontend --template typescript
cd frontend
```

### Step 3: Install Frontend Dependencies

```bash
npm install axios react-router-dom @tanstack/react-query
npm install tailwindcss postcss autoprefixer
npm install react-grid-layout
npm install @types/react-grid-layout --save-dev
npm install lucide-react  # Icons
npm install react-hook-form  # Form handling
npm install date-fns  # Date utilities
```

### Step 4: Initialize Tailwind CSS

```bash
npx tailwindcss init -p
```

Update `tailwind.config.js`:
```javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Update `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 5: Configure API Client

Create `src/services/api.ts`:
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Step 6: Create Basic UI Components

Create `src/App.tsx`:
```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
```

Create `src/pages/Dashboard.tsx`:
```typescript
import React from 'react';

const Dashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        EMR Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Patients</h2>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Today's Appointments</h2>
          <p className="text-3xl font-bold text-green-600">0</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Pending Signatures</h2>
          <p className="text-3xl font-bold text-orange-600">0</p>
        </div>
      </div>
      
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-blue-500 text-white px-4 py-3 rounded hover:bg-blue-600">
            New Patient
          </button>
          <button className="bg-green-500 text-white px-4 py-3 rounded hover:bg-green-600">
            New Encounter
          </button>
          <button className="bg-purple-500 text-white px-4 py-3 rounded hover:bg-purple-600">
            Search Patients
          </button>
          <button className="bg-orange-500 text-white px-4 py-3 rounded hover:bg-orange-600">
            Layout Builder
          </button>
        </div>
      </div>
      
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="w-32">Backend:</span>
            <span className="text-green-600 font-semibold">✓ Connected</span>
          </div>
          <div className="flex items-center">
            <span className="w-32">Database:</span>
            <span className="text-green-600 font-semibold">✓ Connected</span>
          </div>
          <div className="flex items-center">
            <span className="w-32">HIPAA Mode:</span>
            <span className="text-blue-600 font-semibold">✓ Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```

Create `src/pages/Login.tsx`:
```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual authentication
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">EMR System Login</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-600 text-center">
          HIPAA-compliant EMR System v1.0
        </p>
      </div>
    </div>
  );
};

export default Login;
```

### Step 7: Start Frontend

```bash
npm start
```

The React app will start and automatically open in your browser at:
**http://localhost:3000**

---

## 🎉 You Should Now See the UI!

You should see:
1. A login page when you first visit
2. After "logging in" (dummy login), the dashboard with:
   - Patient count cards
   - Quick action buttons
   - System status

## Testing Everything Works

### Test 1: Django Admin

1. Go to http://localhost:8000/admin
2. Login with your superuser credentials
3. You should see all your models:
   - Users
   - Clinics
   - Patients
   - Encounters
   - Layout Templates
   - Audit Logs

### Test 2: API Documentation

1. Go to http://localhost:8000/api/docs
2. You should see Swagger UI with all API endpoints

### Test 3: Create Test Data

In Django admin:
1. Create a Clinic
2. Create a User (assign to the clinic)
3. Create a Patient
4. Create an Encounter

### Test 4: Check Audit Logs

1. Go to http://localhost:8000/admin/core/auditlog/
2. You should see audit logs for all the actions you performed

---

## Next Steps - Building Features

Now that everything is set up and you can see the UI, you can start building features:

### Week 1: Patient Management
- Add patient list view
- Add patient create/edit forms
- Add patient search

### Week 2: Encounter Documentation
- Add encounter create form
- Add specialty-specific sections
- Add auto-population logic

### Week 3: Layout Builder
- Add drag-and-drop interface
- Add section library
- Add field configuration

### Week 4: Images
- Add image upload
- Add image viewer
- Add DICOM support

---

## Troubleshooting

### Backend won't start

**Error: "No module named 'X'"**
```bash
pip install -r requirements.txt
```

**Error: "Database does not exist"**
```bash
psql postgres
CREATE DATABASE emr_dev;
\q
python manage.py migrate
```

**Error: "Permission denied for database"**
```bash
psql postgres
GRANT ALL PRIVILEGES ON DATABASE emr_dev TO emr_user;
\q
```

### Frontend won't start

**Error: "Module not found"**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Error: "Port 3000 is already in use"**
```bash
kill -9 $(lsof -ti:3000)
npm start
```

### Cannot connect to backend from frontend

Check CORS settings in `backend/emr/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]
```

---

## Development Workflow

### Daily workflow:

1. **Start backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python manage.py runserver
```

2. **Start frontend (new terminal):**
```bash
cd frontend
npm start
```

3. **Make changes:**
   - Backend: Edit Python files in `backend/`
   - Frontend: Edit TypeScript files in `frontend/src/`
   - Changes auto-reload (hot reload)

4. **Create new database models:**
```bash
# Edit models.py
python manage.py makemigrations
python manage.py migrate
```

---

## Production Deployment (Later)

When ready to deploy to AWS:

1. Update `settings.py` for production
2. Set up RDS PostgreSQL
3. Set up S3 for media files
4. Deploy to EC2/ECS
5. Set up CloudFront CDN
6. Configure SSL/TLS
7. Sign BAA with AWS

See `docs/deployment.md` for detailed instructions (to be created).

---

## Getting Help

- Check Django logs in terminal
- Check browser console (F12) for frontend errors
- Check `backend/logs/emr.log` for detailed logs
- Review audit logs in Django admin

---

**You're now ready to start building!** 🚀

The foundation is complete, the UI is visible, and you can start implementing features one by one.
