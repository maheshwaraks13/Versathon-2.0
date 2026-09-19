# AI-Powered Medical Report Simplifier — Backend

> **Hackathon Project — Versathon 2.0**
> Branch: `backend-medical-report`

---

## Project Overview

This backend accepts uploaded medical reports (PDF or image files), extracts text using native PDF parsing or OCR, sends the text to an AI model for structured data extraction, and returns patient-friendly summaries via a REST API.

**This system does not provide medical diagnosis, treatment recommendations, or substitute for professional medical advice.**

---

## Architecture

```
User Upload (PDF / JPG / PNG)
        ↓
File Validation & Secure Storage
        ↓
Report DB Record (status: uploaded)
        ↓
Background Processing Pipeline
  ├── Text Extraction (pdfplumber)
  ├── OCR Fallback (pytesseract + pdf2image)
  ├── AI Extraction (Google Gemini)
  ├── Pydantic Validation
  ├── Save TestResult records
  └── Generate patient-friendly explanations
        ↓
Report DB Record (status: completed | failed)
        ↓
REST API (list / detail / compare / export)
```

---

## Backend Structure

```
backend/
├── main.py                   # FastAPI app entry point
├── config.py                 # Settings from environment variables
├── database.py               # SQLAlchemy engine, session, init
├── models.py                 # ORM models: Report, TestResult
├── schemas.py                # Pydantic schemas: API + AI extraction
├── requirements.txt
├── .env.example
├── .gitignore
│
├── routes/
│   ├── __init__.py
│   └── reports.py            # All API route handlers
│
├── services/
│   ├── __init__.py
│   ├── file_service.py       # File validation & secure storage
│   ├── document_service.py   # PDF text extraction + OCR dispatch
│   ├── ocr_service.py        # Tesseract OCR for images & scanned PDFs
│   ├── extraction_service.py # AI structured data extraction (Gemini)
│   ├── explanation_service.py# Patient-friendly explanations
│   ├── export_service.py     # JSON / text export builder
│   └── processing_pipeline.py# End-to-end orchestration
│
├── uploads/                  # Uploaded files (git-ignored)
│
└── tests/
    ├── conftest.py
    ├── test_health.py
    ├── test_upload.py
    ├── test_reports.py
    └── test_processing.py
```

---

## Installation

### 1. System Requirements

**Tesseract OCR** (for scanned PDF / image OCR):
- Windows: https://github.com/UB-Mannheim/tesseract/wiki
- Add Tesseract to your system PATH after installation.

**Poppler** (required by pdf2image for PDF → image conversion):
- Windows: https://github.com/oschwartz10612/poppler-windows/releases
- Extract and add the `bin/` directory to your system PATH.

### 2. Python Environment

```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Environment Variables

```bash
cp .env.example .env
# Edit .env and add your AI_API_KEY
```

Required variables:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./medical_reports.db` | Database connection string |
| `AI_API_KEY` | *(required)* | Google Gemini API key |
| `AI_MODEL` | `gemini-1.5-flash` | Gemini model name |
| `UPLOAD_DIR` | `uploads` | Directory for uploaded files |
| `MAX_FILE_SIZE_MB` | `20` | Maximum upload size in MB |

Get a free Gemini API key at: https://ai.google.dev/

### 5. Database Setup

The database is created automatically on first startup. No manual migration needed for SQLite.

To switch to PostgreSQL:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

---

## Running the Server

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Swagger UI: http://127.0.0.1:8000/docs
ReDoc: http://127.0.0.1:8000/redoc

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check + DB status |
| `GET` | `/` | API root info |
| `POST` | `/api/reports/upload` | Upload a medical report |
| `GET` | `/api/reports` | List all reports |
| `GET` | `/api/reports/{id}` | Report detail + test results |
| `GET` | `/api/reports/{id}/tests` | Test results only |
| `GET` | `/api/reports/compare/{test_name}` | Historical values for a test |
| `GET` | `/api/reports/{id}/export?format=json` | JSON export |
| `GET` | `/api/reports/{id}/export?format=text` | Plain text export |
| `DELETE` | `/api/reports/{id}` | Delete a report |

### Example: Upload a Report

```bash
curl -X POST http://localhost:8000/api/reports/upload \
  -F "file=@blood_report.pdf"
```

Response:
```json
{
  "message": "Report uploaded successfully. Processing has started.",
  "report_id": 1,
  "file_name": "blood_report.pdf",
  "status": "uploaded"
}
```

### Example: Poll Processing Status

```bash
curl http://localhost:8000/api/reports/1
```

```json
{
  "id": 1,
  "file_name": "blood_report.pdf",
  "processing_status": "completed",
  "report_date": "2024-01-15",
  "test_results": [
    {
      "test_name": "Hemoglobin",
      "value": "11.5",
      "unit": "g/dL",
      "reference_range": "12.0 - 16.0",
      "explanation": "Hemoglobin measures the oxygen-carrying protein..."
    }
  ]
}
```

### Example: Historical Comparison

```bash
curl http://localhost:8000/api/reports/compare/Hemoglobin
```

---

## Document Processing Pipeline

1. **Validate** — MIME type, extension, file size, empty files
2. **Store** — UUID-based internal filename (never the original filename on disk)
3. **Record** — Create Report in DB with `status=uploaded`
4. **Extract text**:
   - PDF: `pdfplumber` extracts native text
   - If < 50 non-whitespace chars: fall back to OCR via `pdf2image` + `pytesseract`
   - Image: direct OCR via `pytesseract`
5. **AI Extraction** — Strict prompt to Google Gemini; receives only real document text
6. **Pydantic Validation** — All AI JSON validated before any DB write
7. **Save test results** — Generic `(test_name, value, unit, reference_range)` per test
8. **Explanations** — Per-test patient-friendly explanation via Gemini
9. **Complete** — `status=completed`; on any failure: `status=failed` + `error_message`

---

## AI Extraction Rules

The AI prompt strictly enforces:
- Extract ONLY information explicitly present in the document
- Preserve original numerical values and units exactly
- Return `null` for any missing field
- No diagnosis, inference, invented values, or treatment advice

AI response validated through:
1. JSON parsing
2. Pydantic model validation (`ExtractedReport`)
3. Business validation (filter nameless tests)

---

## Safety Limitations

| Concern | Mitigation |
|---|---|
| Path traversal | UUID filenames, path containment check |
| Oversized files | Configurable `MAX_FILE_SIZE_MB` |
| Invalid file types | MIME + extension allowlist |
| API key exposure | Environment variables only, never logged |
| Medical advice | Prompt prohibits diagnosis/treatment |
| Hardcoded data | All data from real DB records only |
| Stack trace exposure | HTTPException with safe error messages |
| Secrets in responses | Internal paths not returned in normal API responses |

---

## Testing

```bash
cd backend
pytest tests/ -v
```

### Test Coverage

| File | Tests |
|---|---|
| `test_health.py` | Health endpoint, root, Swagger |
| `test_upload.py` | Valid/invalid uploads, DB record creation |
| `test_reports.py` | List, get, compare, export endpoints |
| `test_processing.py` | Schema validation, range status, export, mocked AI |

> Tests use an **in-memory SQLite** database. No production data is ever written during tests.

---

## Git Workflow

```bash
# All work is on:
git branch  # → backend-medical-report

# After testing and approval:
git add .
git commit -m "Build medical report processing backend"
git push -u origin backend-medical-report

# DO NOT merge to main without manual review
```

---

## Disclaimer

> This tool provides simplified explanations of information found in medical reports.
> It does not provide a medical diagnosis, treatment recommendation, or substitute
> for professional medical advice. Always consult a qualified healthcare professional.
