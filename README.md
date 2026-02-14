# HIPAA-Compliant EMR System

A generic, compliant electronic medical records platform with customizable layouts for medical practices and surgery centers.

## 🏗️ Architecture

**Backend:** Django 5.0 + Django REST Framework + PostgreSQL
**Frontend:** React 18 + TypeScript + TailwindCSS
**Infrastructure:** AWS (RDS, S3, EC2/ECS)
**Compliance:** HIPAA, Texas Medical Records Laws, 21 CFR Part 11

## 📋 Prerequisites

Before starting, install:
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Git

## 🚀 Quick Start

### 1. Clone and Setup Backend

```bash
cd emr-project/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create PostgreSQL database
createdb emr_dev
createuser emr_user -P  # Set password: emr_password

# Set up environment variables
cp .env.example .env
# Edit .env with your settings

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

Backend now running at: **http://localhost:8000**

### 2. Setup Frontend

```bash
cd emr-project/frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend now running at: **http://localhost:3000**

### 3. Access the Application

Open browser to: **http://localhost:3000**

- **Admin Panel:** http://localhost:8000/admin
- **API Documentation:** http://localhost:8000/api/docs
- **Audit Logs:** http://localhost:8000/admin/core/auditlog/

## 🔐 Compliance Features Built-In

### HIPAA Security Rule
✅ Unique user identification
✅ Automatic logoff (30 min inactivity)
✅ Encryption at rest and in transit
✅ Comprehensive audit logging
✅ Access controls (role-based)
✅ Password complexity requirements
✅ Multi-factor authentication

### Texas Requirements
✅ 10-year record retention for adults
✅ 20-year retention for minors
✅ Patient access within 15 days
✅ Breach notification procedures

### 21 CFR Part 11
✅ Electronic signatures with password re-entry
✅ Tamper-proof audit trails
✅ Signed content hashing

## 📁 Project Structure

```
emr-project/
├── backend/
│   ├── emr/                    # Django project settings
│   ├── core/                   # Users, clinics, audit logs
│   ├── patients/               # Patient management
│   ├── encounters/             # Clinical encounters
│   ├── images/                 # Image/document handling
│   ├── layouts/                # Customizable layouts
│   ├── specialty_ophthalmology/  # Ophth-specific
│   ├── specialty_orthopedics/    # Ortho-specific
│   ├── specialty_cosmetic/       # Cosmetic-specific
│   └── surgery/                # Surgery center features
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── pages/              # Page components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API services
│   │   └── utils/              # Helper functions
├── docs/                       # Documentation
└── scripts/                    # Utility scripts
```

## 🎨 Customization System

### How It Works

1. **Generic Platform:** Core EMR works for any specialty
2. **Paper Chart Collection:** Get examples from pilot practice
3. **Layout Builder:** Drag-and-drop to create custom layouts
4. **Per-Customer Customization:** Each practice gets tailored experience

### Creating Custom Layouts

```python
# Via Django Admin or Layout Builder UI
1. Go to Layout Builder
2. Select specialty and visit type
3. Drag sections from library
4. Configure fields and auto-population
5. Save template
6. Assign to clinic/provider
```

## 🔧 Development Workflow

### Running Tests

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests  
cd frontend
npm test
```

### Database Migrations

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Creating New Specialty

```bash
cd backend
python manage.py startapp specialty_[name]
# Then add to INSTALLED_APPS in settings.py
```

## 📊 Database Schema

Key models:
- **Patient** - Demographics, insurance
- **Encounter** - Clinical visit documentation
- **ClinicalImage** - DICOM and regular images
- **AuditLog** - All system activity (tamper-proof)
- **LayoutTemplate** - Customizable form layouts
- **ElectronicSignature** - Part 11 compliant signatures

See `docs/database_schema.md` for full schema.

## 🚢 Deployment

### AWS Setup

1. **RDS PostgreSQL** - Encrypted database
2. **S3** - Encrypted image/document storage
3. **EC2/ECS** - Application hosting
4. **CloudFront** - CDN for fast image loading

See `docs/deployment.md` for detailed instructions.

## 📝 Legal Compliance

Before going live:
- [ ] Complete HIPAA Security Risk Assessment
- [ ] Review with healthcare attorney ($5-10k)
- [ ] Sign Business Associate Agreement with AWS
- [ ] Obtain cyber liability insurance
- [ ] Document all policies and procedures

See `docs/compliance_checklist.md`

## 🛠️ Tech Stack Details

### Backend
- **Django 5.0** - Web framework
- **Django REST Framework** - API
- **PostgreSQL 15** - Database
- **Celery** - Background tasks
- **Redis** - Caching, Celery broker
- **Pillow** - Image processing
- **pydicom** - DICOM handling
- **cryptography** - Encryption

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **React Query** - Data fetching
- **React Router** - Navigation
- **React Grid Layout** - Drag-and-drop layouts
- **Cornerstone.js** - DICOM viewer

## 📞 Support

For questions or issues:
- Documentation: `/docs`
- Issues: Create GitHub issue
- Security: security@your-domain.com

## 📄 License

Proprietary - All rights reserved

## 🎯 Roadmap

- [x] Phase 1: Generic compliant platform
- [x] Phase 2: Customization system
- [ ] Phase 3: Paper chart collection tools
- [ ] Phase 4: Legal review prep
- [ ] Phase 5: Pilot launch
- [ ] Phase 6: Commercial release

---

**Built by providers, for providers.**
