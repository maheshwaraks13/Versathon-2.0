# 🩺 MedClear — AI-Powered Medical Report Simplifier

**Understand Your Report. Not Just the Numbers.**

MedClear is an AI-powered medical report simplification application that converts complex laboratory reports into **simple, structured, plain-language explanations**.

Users can paste report text or upload a medical report image/PDF. MedClear extracts important laboratory information such as test names, values, units, reference ranges, dates, and result status, then presents the information in an easy-to-understand format.

> ⚠️ **Medical Disclaimer**
>
> MedClear is an educational tool only. It explains laboratory values in plain language and indicates whether a result is high, low, or normal relative to its provided reference range.
>
> **MedClear does not diagnose medical conditions, recommend treatment, or replace professional medical advice. Always consult a qualified healthcare provider regarding your medical results.**

---

## ✨ Features

### 📄 Report Input

* Paste laboratory report text directly.
* Upload an image or PDF of a medical report.
* Support messy and real-world report formats.

### 🤖 AI-Powered Extraction

MedClear extracts structured information from reports, including:

* Test name
* Test value
* Unit
* Reference range
* Report date
* Result status — **High / Low / Normal**

### 💡 Plain-Language Explanations

Each extracted test result receives a short, easy-to-understand explanation describing:

* What the test measures
* What the reported value represents
* Whether the value is within the provided reference range

The system is designed to provide explanations without making medical diagnoses or treatment recommendations.

### 🌐 Multi-Language Support

MedClear supports:

* English
* Hindi
* Tamil
* Telugu
* Kannada
* Malayalam

AI explanations are generated directly in the selected language rather than being translated after generation.

### 📈 Historical Comparison

Users can save reports and track individual test values over time.

Historical information can be presented using:

* Trend charts
* Tabular comparisons
* Previous report values

### 📥 Exportable Summary

Users can generate a clean PDF summary containing:

* Simplified test results
* Explanations
* Relevant report information
* Medical disclaimer

The exported summary can be used as a reference when discussing results with a healthcare professional.

### 🔒 Safety-First AI Design

The application's **"never diagnose, never recommend treatment"** constraint is enforced in the system prompt sent to the LLM.

This safety constraint applies across:

* Supported languages
* Text input
* Image input

The disclaimer is also displayed throughout the application and included in exported reports.

---

## 🧱 Tech Stack

| Layer      | Technology             |
| ---------- | ---------------------- |
| Frontend   | React                  |
| Styling    | Tailwind CSS           |
| Backend    | Node.js + Express      |
| Database   | SQLite                 |
| AI / LLM   | Claude API (Anthropic) |
| PDF Export | jsPDF                  |
| Charts     | Chart.js               |

---

## 📁 Project Structure

```text
versathon/
│
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   │   └── Express application entry point
│   │   │
│   │   ├── routes/
│   │   │   └── reportRoutes.js
│   │   │       └── Report analysis endpoint routing
│   │   │
│   │   ├── controllers/
│   │   │   └── reportController.js
│   │   │       └── Request handling and database persistence
│   │   │
│   │   ├── services/
│   │   │   └── llmService.js
│   │   │       └── LLM prompts and API calls
│   │   │
│   │   └── db/
│   │       └── index.js
│   │           └── SQLite connection and schema
│   │
│   ├── medclear.sqlite
│   │   └── SQLite database generated at runtime
│   │
│   ├── .env
│   │   └── Local API keys and configuration
│   │
│   └── .env.example
│       └── Environment variable template
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── UI components such as input, results and history
    │   │
    │   ├── locales/
    │   │   └── Translation files
    │   │
    │   └── App.jsx
    │
    └── index.html
```

### 🌐 Frontend Localization Files

The `locales/` directory contains language resources for:

```text
en
hi
ta
te
kn
ml
```

---

## ⚙️ Setup & Installation

### Prerequisites

Make sure the following are installed:

* **Node.js v18+**
* **Anthropic API key**

---

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd versathon
```

---

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

---

### 3. Install Frontend Dependencies

Open another terminal:

```bash
cd frontend
npm install
```

---

## 🔐 Environment Configuration

Inside the `backend` directory, create a `.env` file using `.env.example` as the template.

```env
PORT=5000
DB_TYPE=sqlite
SQLITE_FILE=medclear.sqlite
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=your_actual_key_here
```

### ⚠️ Security

**Never commit your `.env` file or expose your API key.**

Only the following file should be committed:

```text
.env.example
```

with placeholder values.

---

## ▶️ Running the Application

### Start the Backend

From the `backend` directory:

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

### Start the Frontend

From the `frontend` directory:

```bash
npm run dev
```

The frontend is normally available at:

```text
http://localhost:5173
```

The exact frontend URL may vary depending on the development server output.

---

# 🔌 API

## Analyze Medical Report

### Endpoint

```http
POST /api/report/analyze
```

Analyzes pasted report text or uploaded report content and returns structured, simplified results.

### Example Request

```json
{
  "text": "Hemoglobin 11.2 g/dL (13.0-17.0)\nFasting Glucose 108 mg/dL (70-99)",
  "language": "en"
}
```

### Example Response

```json
{
  "success": true,
  "reportId": 12,
  "report_date": "2026-03-14",
  "results": [
    {
      "test_name": "Hemoglobin",
      "value": "11.2",
      "unit": "g/dL",
      "reference_range": "13.0-17.0",
      "status": "low",
      "explanation": "Hemoglobin is the protein in red blood cells that carries oxygen..."
    }
  ]
}
```

---

# 🌐 Supported Languages

| Language  | Code |
| --------- | ---- |
| English   | `en` |
| Hindi     | `hi` |
| Tamil     | `ta` |
| Telugu    | `te` |
| Kannada   | `kn` |
| Malayalam | `ml` |

AI-generated explanations are produced directly in the selected language rather than being translated after generation.

---

# 🛡️ Safety & Responsible AI

MedClear is intentionally designed as an **explanation tool rather than a diagnostic system**.

The application follows two primary safety constraints:

### 1. Never Diagnose

The AI must not identify or claim that a user has a medical condition based on laboratory results.

### 2. Never Recommend Treatment

The AI must not prescribe medication, recommend treatment, or provide instructions for medical intervention.

These constraints are enforced at the LLM system-prompt level and are not dependent only on the visible UI disclaimer.

### Important Limitation

Reference ranges can vary depending on the laboratory, testing method, patient characteristics, and other factors.

Therefore, MedClear should be used only for educational understanding of reported laboratory results.

For medical interpretation or decisions, users should consult a qualified healthcare professional.

---

# 📊 Historical Tracking

MedClear supports saving reports and comparing test values over time.

The historical view is intended to help users observe how a particular laboratory value changes across reports.

Information can be presented through:

* 📈 Trend charts
* 📋 Historical tables
* 📅 Report dates
* 🔎 Test-specific comparisons

---

# 📄 PDF Export

MedClear can generate an exportable PDF containing the simplified report information.

The exported document includes the relevant medical disclaimer so that the educational nature of the application remains clear outside the application itself.

---

# 🗺️ Roadmap

The following features are planned for future development:

* [ ] Per-user authentication for private, multi-user report history
* [ ] Normalized database schema for faster historical queries by test name
* [ ] Additional language support
* [ ] Mobile-optimized camera capture for medical report photos

---

# 🧪 Example Workflow

```text
                 ┌─────────────────────┐
                 │   Medical Report    │
                 └──────────┬──────────┘
                            │
                    Paste / Upload
                            │
                            ▼
                 ┌─────────────────────┐
                 │   Report Analysis   │
                 │     AI / LLM        │
                 └──────────┬──────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │ Structured Data Extraction│
              │                           │
              │ Test Name                 │
              │ Value                     │
              │ Unit                      │
              │ Reference Range           │
              │ Date                      │
              │ Status                    │
              └─────────────┬─────────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Plain-Language      │
                 │ Explanation         │
                 └──────────┬──────────┘
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
        ┌─────────────────┐   ┌─────────────────┐
        │ Current Results │   │ Historical Data │
        └────────┬────────┘   └────────┬────────┘
                 │                     │
                 └──────────┬──────────┘
                            ▼
                 ┌─────────────────────┐
                 │ PDF Summary Export  │
                 └─────────────────────┘
```

---

# 🎯 Project Purpose

MedClear was developed as a hackathon project to make laboratory reports easier to understand for non-technical users.

The goal is **not to replace doctors or provide medical diagnoses**.

Instead, MedClear focuses on transforming complex laboratory information into a structured and understandable format while maintaining clear safety boundaries.

---

# 📜 License

This project was built for a **hackathon submission** and is provided as-is for educational and demonstration purposes.
