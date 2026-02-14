# Database Schema Documentation

## Overview

This document describes the complete database schema for the HIPAA-compliant EMR system.

## Entity Relationship Overview

```
┌─────────────┐
│   Clinic    │──┐
└─────────────┘  │
                 │
         ┌───────┴────────┬──────────────────┐
         │                │                  │
    ┌────▼────┐      ┌────▼────┐      ┌─────▼──────┐
    │  User   │      │ Patient │      │  Template  │
    └────┬────┘      └────┬────┘      └────────────┘
         │                │
         │                ├───────────────┐
         │                │               │
    ┌────▼────────┐  ┌────▼────┐   ┌────▼─────────┐
    │  Encounter  │──│Allergy  │   │  Medication  │
    └────┬────────┘  └─────────┘   └──────────────┘
         │
         ├────────────────┬──────────────────┬────────────┐
         │                │                  │            │
    ┌────▼────┐      ┌────▼────┐      ┌─────▼──┐   ┌────▼─────┐
    │  Vital  │      │  Image  │      │E-Signature│ │AuditLog  │
    └─────────┘      └─────────┘      └───────────┘ └──────────┘
```

## Core Tables

### 1. Clinics
**Purpose:** Medical practices and surgery centers (multi-tenant)

**Key Fields:**
- `id` (PK)
- `name` - Clinic name
- `npi` - National Provider Identifier
- `address`, `city`, `state`, `zip_code`
- `clinic_type` - primary_care, specialty, surgery_center
- `specialties` (JSON) - List of specialties offered
- `hipaa_trained` - Compliance status
- `baa_signed_date` - Business Associate Agreement date

**Relationships:**
- Has many Users
- Has many Patients
- Has many Layout Templates

**Compliance Notes:**
- Each clinic is isolated (multi-tenant)
- BAA tracking required for HIPAA
- Security audit dates tracked

---

### 2. Users
**Purpose:** System users with role-based access control

**Key Fields:**
- `id` (PK)
- `username` (unique)
- `email`
- `first_name`, `last_name`
- `clinic_id` (FK → Clinics)
- `role` - physician, nurse, tech, admin, etc.
- `npi` - National Provider Identifier
- `license_number`, `license_state`
- `dea_number` - For prescribing
- `mfa_enabled` - Multi-factor authentication
- `hipaa_trained`, `hipaa_training_date`
- `last_password_change`
- `failed_login_attempts`

**Relationships:**
- Belongs to Clinic
- Creates Patients, Encounters
- Has preferred Layout Template

**Compliance Notes:**
- Unique user identification (HIPAA § 164.312(a)(2)(i))
- MFA recommended
- HIPAA training tracking required
- Account lockout after failed attempts
- Password expiration tracked

---

### 3. Patients
**Purpose:** Patient demographics and core information (PHI)

**Key Fields:**
- `id` (PK)
- `clinic_id` (FK → Clinics)
- `medical_record_number` - Unique per clinic
- `first_name`, `last_name`, `date_of_birth`
- `gender`
- `ssn_encrypted` - Encrypted SSN
- `phone_primary`, `email`
- `address`, `city`, `state`, `zip_code`
- `insurance_primary_*` - Primary insurance info
- `privacy_restrictions` (JSON) - Patient-requested restrictions
- `consent_for_treatment`, `consent_for_phi_disclosure`
- `is_deceased`, `deceased_date`
- `record_retention_date` - Per Texas law

**Relationships:**
- Belongs to Clinic
- Has many Encounters
- Has many Allergies, Medications, Problems
- Has many Images

**Compliance Notes:**
- SSN encrypted with Fernet (HIPAA requirement)
- Privacy restrictions honored (HIPAA § 164.522)
- Record retention: 10 years adults, 20 years minors (Texas law)
- Patient consent tracking

---

### 4. Allergies
**Purpose:** Patient allergy tracking

**Key Fields:**
- `id` (PK)
- `patient_id` (FK → Patients)
- `allergen` - Drug, food, environmental
- `severity` - mild, moderate, severe
- `reaction` - Description
- `is_active`

**Safety Note:** Critical for medication safety

---

### 5. Medications
**Purpose:** Current medications list

**Key Fields:**
- `id` (PK)
- `patient_id` (FK → Patients)
- `name`, `dosage`, `frequency`, `route`
- `prescribed_by`, `prescribed_date`
- `is_active`
- `discontinued_date`, `discontinued_reason`

**Compliance Note:** Required for continuity of care

---

### 6. Problems
**Purpose:** Problem/diagnosis list

**Key Fields:**
- `id` (PK)
- `patient_id` (FK → Patients)
- `description`
- `icd10_code`
- `status` - active, resolved, chronic
- `onset_date`, `resolved_date`

---

### 7. Encounters
**Purpose:** Clinical visits and documentation

**Key Fields:**
- `id` (PK)
- `patient_id` (FK → Patients)
- `clinic_id` (FK → Clinics)
- `provider_id` (FK → Users)
- `encounter_date`
- `encounter_type` - new_patient, follow_up, surgery, etc.
- `chief_complaint`
- `specialty` - ophthalmology, orthopedics, cosmetic
- `clinical_data` (JSON) - Specialty-specific exam data
- `assessment`, `plan`
- `status` - draft, in_progress, signed, amended
- `is_locked` - Locked after signing
- `is_amended`, `amendment_reason`

**Relationships:**
- Belongs to Patient, Clinic, Provider
- Has many Diagnoses, Procedures
- Has many Images
- Has many Electronic Signatures
- Has many Vitals

**Compliance Notes:**
- Cannot edit after signing (locked)
- Amendment tracking (21 CFR Part 11)
- Content hash for signature verification

---

### 8. Electronic Signatures
**Purpose:** 21 CFR Part 11 compliant signatures

**Key Fields:**
- `id` (PK)
- `encounter_id` (FK → Encounters)
- `signer_id` (FK → Users, PROTECT)
- `signer_name` - Preserved name
- `signed_at`
- `meaning` - authorship, review, approval
- `password_verified`, `biometric_verified`
- `content_hash` - SHA-256 of signed content
- `signature_hash` - Hash of signature components
- `ip_address`, `user_agent`

**Compliance Notes:**
- Cannot be deleted (PROTECT on user)
- Tamper-proof (hash verification)
- Timestamped
- Authentication method recorded
- Meets 21 CFR Part 11 requirements

---

### 9. Audit Logs
**Purpose:** Comprehensive audit trail (HIPAA § 164.312(b))

**Key Fields:**
- `id` (PK)
- `user_id` (FK → Users, nullable)
- `username` - Preserved even if user deleted
- `user_role`
- `action` - create, read, update, delete, login, etc.
- `resource_type` - patient, encounter, image, etc.
- `resource_id`
- `timestamp` (indexed)
- `ip_address`, `user_agent`
- `reason` - For break-the-glass access
- `changes` (JSON) - What changed
- `previous_log_hash` - For tamper detection
- `log_hash` - SHA-256 hash

**Relationships:**
- References User (nullable)
- References Clinic

**Compliance Notes:**
- Cannot be deleted (no delete permission)
- Chain of custody (hash linking)
- Tamper detection
- Retained 6+ years
- All PHI access logged

---

### 10. Clinical Images
**Purpose:** Medical images and documents

**Key Fields:**
- `id` (UUID, PK)
- `encounter_id` (FK → Encounters)
- `patient_id` (FK → Patients)
- `image_type` - oct, fundus_photo, xray, photo_preop, etc.
- `specialty`
- `laterality` - OD, OS, OU, right, left
- `image_file` - S3 path
- `thumbnail` - Generated thumbnail
- `is_dicom`
- `dicom_metadata` (JSON) - DICOM tags
- `series_id` (UUID) - Groups related images
- `photo_type` - before, after, during
- `annotations` (JSON) - Markup data
- `is_sensitive` - Extra permissions required
- `uploaded_by_id` (FK → Users)

**Relationships:**
- Belongs to Encounter, Patient
- Part of Image Series

**Compliance Notes:**
- Encrypted in S3
- Audit all access
- Sensitive flag for extra protection

---

### 11. Layout Templates
**Purpose:** Customizable form layouts (key to customization system)

**Key Fields:**
- `id` (PK)
- `name`
- `specialty` - ophthalmology, orthopedics, cosmetic
- `visit_type` - new_patient, follow_up, surgery, etc.
- `clinic_id` (FK → Clinics, nullable)
- `provider_id` (FK → Users, nullable)
- `is_global` - Available to all
- `layout` (JSON) - Complete layout configuration
- `auto_population_enabled`
- `usage_count`

**JSON Structure (layout field):**
```json
{
  "pages": [
    {
      "page_number": 1,
      "sections": [
        {
          "id": "visual_acuity",
          "title": "Visual Acuity",
          "position": {"x": 0, "y": 0, "width": 6, "height": 3},
          "fields": [
            {
              "name": "va_od",
              "label": "OD",
              "type": "select",
              "options": ["20/20", "20/25", "20/30"],
              "auto_populate": "last_value"
            }
          ]
        }
      ]
    }
  ]
}
```

**Relationships:**
- Can belong to Clinic (clinic-specific)
- Can belong to Provider (provider-specific)
- Or global (available to all)

**Business Logic:**
- Allows per-customer customization
- Mirrors their paper charts
- Single codebase, many layouts

---

### 12. Layout Sections
**Purpose:** Pre-built sections for layout builder

**Key Fields:**
- `id` (PK)
- `name`
- `specialty`, `category`
- `fields` (JSON) - Field definitions
- `default_width`, `default_height`
- `is_public`
- `usage_count`

**Purpose:**
- Building blocks for layouts
- Drag-and-drop into forms
- Reusable across clinics

---

## Specialty-Specific Tables

### Ophthalmology Exam
(To be created as needed - stores in Encounter.clinical_data as JSON initially)

### Orthopedics Exam
(To be created as needed - stores in Encounter.clinical_data as JSON initially)

### Cosmetic Surgery
(To be created as needed - stores in Encounter.clinical_data as JSON initially)

---

## Indexes

**Critical indexes for performance:**

1. **Patients:**
   - `(clinic_id, medical_record_number)` - UNIQUE
   - `(clinic_id, last_name, first_name)`
   - `(clinic_id, date_of_birth)`

2. **Encounters:**
   - `(patient_id, encounter_date DESC)`
   - `(provider_id, encounter_date DESC)`
   - `(clinic_id, encounter_date DESC)`
   - `(status)`

3. **Audit Logs:**
   - `(timestamp DESC)` - Most common query
   - `(user_id, timestamp DESC)`
   - `(resource_type, resource_id)`
   - `(clinic_id, timestamp DESC)`

4. **Clinical Images:**
   - `(patient_id, uploaded_at DESC)`
   - `(encounter_id)`
   - `(series_id)`

---

## Data Types

**Encryption:**
- SSN: Encrypted with Fernet
- Stored as VARCHAR(500)
- Decrypt on read, encrypt on write

**JSON Fields:**
- Clinical data: Flexible specialty-specific data
- Layout configuration: Complete UI definition
- DICOM metadata: Medical imaging tags
- Privacy restrictions: Patient-specific rules

**Dates:**
- All timestamps: `TIMESTAMP WITH TIME ZONE`
- Dates only: `DATE`

**IDs:**
- Most tables: `BIGINT` (auto-increment)
- Images/Series: `UUID` (distributed systems)

---

## Constraints

**Foreign Keys:**
- All FKs have `ON DELETE` strategy
- Most: `CASCADE` (delete children)
- Signatures: `PROTECT` (cannot delete signer)
- References: `SET NULL` (preserve audit trail)

**Unique Constraints:**
- `(clinic_id, medical_record_number)` - Patient MRN
- `username` - User login
- ICD-10 codes, CPT codes

**Check Constraints:**
- Age calculation for minors
- Password complexity (application level)
- Required fields per status

---

## Retention Policies

**Texas Law Requirements:**
- Adults: 10 years from last treatment
- Minors: Until age 20 or 20 years from last treatment
- Calculated automatically in `Patient.calculate_retention_date()`

**Audit Logs:**
- 6+ years minimum
- Never deleted (compliance requirement)

**Images:**
- Same as patient records
- Encrypted in S3
- Versioned for disaster recovery

---

## Backup Strategy

**Daily:**
- Full database backup
- Point-in-time recovery capability
- Encrypted backups

**Testing:**
- Monthly restore test
- Documented in compliance records

**Disaster Recovery:**
- RTO: 4 hours
- RPO: 24 hours

---

## Security

**At Rest:**
- Database encryption: AWS RDS encryption
- Files: S3 server-side encryption (AES-256)
- SSN: Application-level Fernet encryption

**In Transit:**
- TLS 1.2+ only
- HTTPS enforced
- No cleartext transmission

**Access Control:**
- Row-level security (clinic_id filtering)
- Role-based permissions
- MFA for sensitive operations

---

This schema is designed to be:
1. **HIPAA compliant** - All requirements met
2. **Texas law compliant** - Retention, access, breach notification
3. **21 CFR Part 11 compliant** - Electronic signatures
4. **Scalable** - Handles multiple clinics (multi-tenant)
5. **Customizable** - Layout system allows per-customer configuration
6. **Auditable** - Comprehensive audit trail
