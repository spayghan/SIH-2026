# AI-Powered Legal Metrology & Packaged Commodity Compliance System

> **Inspect offline. Detect intelligently. Verify reliably. Decide transparently.**

An **AI-powered Legal Metrology Inspection Copilot** designed to assist field inspectors in identifying and evaluating compliance of packaged commodities.

The system combines **offline-first Progressive Web App (PWA)** capabilities, Computer Vision, OCR, barcode/QR processing, deterministic compliance rules, geospatial analytics, evidence management, and optional external verification services.

Developed as an **SIH 2026 MVP** for the **Ministry of Consumer Affairs — Legal Metrology Division**.

---

## 🚀 Key Features

* 📱 **Offline-First Inspection**

  * Capture package images, metadata, barcode/QR codes, and location without network connectivity.
  * Store inspection data locally using IndexedDB.
  * Automatically synchronize when connectivity is restored.

* 🤖 **AI-Powered Visual Inspection**

  * YOLOv8 for detecting regulatory marks and visual elements.
  * Returns bounding boxes and confidence scores.

* 🔍 **OCR & Intelligent Label Extraction**

  * PaddleOCR extracts text from product packaging.
  * Groq/OpenAI adapters convert extracted text into structured JSON.

* ⚖️ **Deterministic Compliance Rule Engine**

  * Evaluates extracted product information against category-specific legal rules.
  * Produces explainable:

    * `PASS`
    * `FAIL`
    * `REVIEW`

* 📦 **Barcode & Product Verification**

  * Barcode/QR decoding using Pyzbar.
  * Cross-checks package information against trusted reference data.

* 🌐 **Optional External Verification**

  * Adapter-based integration with services such as:

    * FSSAI / FoSCoS
    * GST
    * GS1 / Product Data
    * Google Maps
    * Bhashini
    * Groq
    * OpenAI

* 🗺️ **Geospatial Analytics**

  * Converts GPS coordinates into structured locations.
  * Uses PostGIS for spatial analysis and district-level heatmaps.

* 📄 **Evidence-Based Reporting**

  * Generates inspection/compliance reports containing findings, evidence, timestamps, confidence values, verification status, and rule versions.

* 🔐 **Security & Auditability**

  * JWT/OAuth2 authentication.
  * Role-Based Access Control.
  * SHA-256 evidence hashing.
  * Immutable audit records.
  * Human-in-the-loop review for uncertain AI results.

---

## 🏗️ System Architecture

The system follows a **7-phase enterprise architecture**:

```text
┌─────────────────────────────────────────────────────────────┐
│                 PHASE 1 — OFFLINE INSPECTION                │
│                                                             │
│ Inspector Device → Next.js PWA → Camera / Barcode / GPS    │
│                         ↓                                   │
│                    IndexedDB                                │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│          PHASE 2 — NETWORK RECOVERY & API GATEWAY           │
│                                                             │
│ Background Sync → FastAPI → JWT/OAuth2 → HTTP 202           │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  PHASE 3 — REDIS DISPATCH                   │
│                                                             │
│ Vision │ OCR/LLM │ Barcode │ External Verification Queues   │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│             PHASE 4 — AI & VERIFICATION WORKERS             │
│                                                             │
│ YOLOv8 │ PaddleOCR │ Pyzbar │ Groq/OpenAI │ API Adapters    │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│               PHASE 5 — DETERMINISTIC RULE ENGINE           │
│                                                             │
│ Category Rules → Field Validation → Cross-Modal Checks      │
│                         ↓                                   │
│                    PASS / FAIL / REVIEW                     │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│               PHASE 6 — DATABASE & EVIDENCE                 │
│                                                             │
│ PostgreSQL + PostGIS + Storage → Inspections + Audit Logs   │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  PHASE 7 — REVIEW & REPORTING               │
│                                                             │
│ Dashboard → Human Review → PDF Report → GIS Heatmaps        │
└─────────────────────────────────────────────────────────────┘
```

The architecture separates **project-owned APIs** from optional external services, allowing the core workflow to remain functional even when external APIs, credentials, quotas, or network access are unavailable.

---

## 🛠️ Technology Stack

| Layer           | Technology                   | Purpose                              |
| --------------- | ---------------------------- | ------------------------------------ |
| Frontend        | Next.js, React, Tailwind CSS | Inspector UI & dashboard             |
| PWA             | Service Workers, IndexedDB   | Offline inspection & synchronization |
| Backend         | FastAPI                      | Project-owned API layer              |
| Authentication  | JWT / OAuth2                 | Secure API access                    |
| Queue           | Redis                        | Asynchronous task processing         |
| Computer Vision | YOLOv8                       | Regulatory mark detection            |
| OCR             | PaddleOCR                    | Package text extraction              |
| Barcode         | Pyzbar                       | Barcode/QR decoding                  |
| LLM             | Groq / OpenAI                | Structured information extraction    |
| Database        | PostgreSQL / Supabase        | Persistent application data          |
| GIS             | PostGIS                      | Spatial data & analytics             |
| Maps            | Google Maps / Geocoding      | Location enrichment                  |
| Translation     | Bhashini                     | Indian-language support              |
| Reporting       | jsPDF                        | Inspection PDF generation            |

---

## 🔌 API Architecture

The project uses **project-owned FastAPI endpoints** as the stable application interface.

### Core API Endpoints

| Method | Endpoint            | Purpose                                                 |
| ------ | ------------------- | ------------------------------------------------------- |
| `POST` | `/scan-product`     | Upload inspection images, metadata and optional barcode |
| `POST` | `/extract-label`    | Run OCR and structured field extraction                 |
| `POST` | `/detect-marks`     | Detect regulatory marks using YOLOv8                    |
| `POST` | `/check-compliance` | Evaluate extracted data against active rules            |
| `POST` | `/verify-product`   | Perform reference/external verification                 |
| `GET`  | `/inspection/{id}`  | Retrieve inspection state and evidence                  |
| `POST` | `/generate-report`  | Generate compliance inspection PDF                      |

The SRS defines external integrations as **optional adapters**, with explicit statuses such as `VERIFIED`, `FAILED`, `REVIEW`, and `VERIFICATION_REQUIRED` rather than presenting mock/local data as live government verification.

---

## 🧠 Compliance Workflow

```text
Product Package
      ↓
Image / Barcode / GPS Capture
      ↓
Offline Local Storage
      ↓
Network Recovery
      ↓
FastAPI Gateway
      ↓
Redis Task Queue
      ↓
 ┌───────────────┬───────────────┬───────────────┐
 │   YOLOv8      │   PaddleOCR   │    Pyzbar     │
 │ Mark Detection│ Text Extraction│ Barcode/QR    │
 └───────────────┴───────────────┴───────────────┘
                      ↓
              Structured Data
                      ↓
             Deterministic Rules
                      ↓
              Cross-Modal Checks
                      ↓
             PASS / FAIL / REVIEW
                      ↓
             Evidence & Audit Log
                      ↓
             Human Review / Report
```

---

## ⭐ Unique Selling Propositions

### 1. Zero-Data-Loss Offline Synchronization

Field inspections can continue in low or no-connectivity environments using IndexedDB and client-generated UUIDs.

### 2. Asynchronous Processing

Heavy AI and verification workloads are processed asynchronously through Redis queues without blocking the API layer.

### 3. Cross-Modal Tamper Detection

The system can compare OCR-extracted package information with barcode/product reference data when trusted reference information is available.

### 4. Deterministic Compliance AI

AI is used for **extraction and detection**, while a deterministic Python rule engine evaluates legal requirements.

This makes compliance decisions more explainable and traceable.

### 5. Multilingual & Geospatial Intelligence

Regional-language support and geospatial analytics improve usability for field inspectors and administrative decision-making.

### 6. API-Independent Core

The core inspection workflow can continue using local AI, OCR, rules, and project-owned APIs even when optional external APIs are unavailable.

---

## 💾 Data Model

The system maintains structured inspection and evidence data.

```text
inspections
├── inspection_id
├── inspector_id
├── status
├── timestamps
├── category
└── location

inspection_items
├── detected_fields
├── values
├── confidence
└── evidence_references

rules_db
├── rule_id
├── legal_section
├── category
├── conditions
└── active_version

reference_barcodes
├── SKU / Barcode
├── reference_values
└── trusted_source_metadata

verification_results
├── provider
├── request_status
├── verification_status
└── response_metadata

audit_logs
├── events
├── reviewer_actions
├── model_versions
├── rule_versions
└── hashes

inspection_geometries
├── PostGIS geometry
├── district
└── administrative attributes
```

---

## 🔐 Security & Compliance

The system is designed with evidence integrity and auditability in mind.

* 🔒 **RBAC** for inspectors, supervisors, and administrators.
* 🔑 **JWT/OAuth2** authentication.
* 🧾 **SHA-256 hashes** for inspection evidence.
* 📋 **Immutable audit records**.
* 🧠 **Pydantic schema validation** for AI-generated structured data.
* 👨‍⚖️ **Human-in-the-loop review** for uncertain results.
* 🚫 No fabricated government verification results.
* 🔄 Explicit `VERIFICATION_REQUIRED` status when external verification is unavailable.

The system does not automatically turn uncertain AI output into a legal penalty without human review.

---

## 📊 Expected Inspection Result

Each inspection produces a structured result containing:

```text
Compliance Status
    → PASS / FAIL / REVIEW

Compliance Score
    → Calculated from deterministic rule outcomes

Detected Category
    → AI/category engine output

Detected Fields
    → Structured label information + confidence

Evidence
    → Images + bounding boxes

Verification Status
    → VERIFIED / FAILED /
      VERIFICATION_REQUIRED / NOT_APPLICABLE

Rule Version
    → Exact rule set used

Audit Trail
    → Timestamps + model versions +
      reviewer actions + hashes
```

---

## 🚀 SIH 2026 MVP Strategy

The MVP prioritizes a complete **end-to-end local workflow** before optional external integrations.

### Development Priorities

1. Build project-owned FastAPI APIs.
2. Create a curated rule database for selected commodity categories.
3. Train/fine-tune YOLOv8 for required regulatory marks.
4. Implement PaddleOCR and Pydantic validation.
5. Create a demo/reference barcode dataset.
6. Add external integrations through optional adapters.
7. Generate evidence-backed compliance reports.

This approach ensures the SIH demonstration remains functional even when external services are unavailable.

---

## 📁 Suggested Project Structure

```text
legal-metrology-compliance/
│
├── frontend/
│   ├── app/
│   ├── components/
│   └── public/
│
├── backend/
│   ├── api/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   └── main.py
│
├── ai/
│   ├── yolo/
│   ├── ocr/
│   ├── barcode/
│   └── llm/
│
├── rule-engine/
│   ├── rules/
│   ├── validators/
│   └── engine.py
│
├── database/
│   ├── migrations/
│   └── seed/
│
├── reports/
│
├── tests/
│
├── requirements.txt
├── docker-compose.yml
└── README.md
```

---

## ⚙️ Installation

### Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd legal-metrology-compliance
```

### Backend Setup

```bash
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Linux/macOS:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### Start FastAPI

```bash
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 External API Integrations

External services are implemented through adapter interfaces.

```text
                    ┌─────────────────────┐
                    │   Core Application   │
                    └──────────┬──────────┘
                               │
                       Adapter Interface
                               │
          ┌────────────┬───────┼────────┬───────────┐
          ↓            ↓       ↓        ↓           ↓
       FSSAI          GST     GS1    Maps       Bhashini
                               │
                         Groq / OpenAI
```

If an external service is unavailable, the system falls back to local/reference data and marks the verification status appropriately.

---

## 📌 Project Status

**Status:** 🚧 SIH 2026 MVP Development

The current architecture is designed to support a demonstrable end-to-end workflow covering:

* Offline inspection
* AI-based detection
* OCR extraction
* Barcode processing
* Compliance rule evaluation
* Verification orchestration
* Evidence management
* Human review
* PDF reporting
* Geospatial analytics

---

## 🎯 Vision

To build a reliable, explainable, and field-ready **AI inspection assistant** that helps Legal Metrology officials perform packaged-commodity inspections faster while maintaining evidence integrity, deterministic compliance evaluation, and human oversight.

---

## 👥 Team

**Smart India Hackathon 2026 Project**

> AI-Powered Legal Metrology & Packaged Commodity Compliance System

---

## 📄 Documentation

The detailed Software Requirements Specification (SRS) defines the complete system architecture, technology stack, API strategy, functional requirements, data model, security requirements, and MVP implementation strategy.

---

## ⭐ Contributing

Contributions, suggestions, and improvements are welcome.

```text
Fork → Create Branch → Make Changes → Commit → Pull Request
```

---

> **Built for Smart India Hackathon 2026 🇮🇳**
>
> **Inspect offline. Detect intelligently. Verify reliably. Decide transparently.**
