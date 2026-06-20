# Case Study: InvoiceAI — AI-Powered Invoice Data Extraction with Human Review

## Problem

Finance teams processing PDF invoices face two compounding pain points: hours lost to manual data entry, and transcription errors introduced when humans copy numbers, dates, and vendor names under time pressure. Off-the-shelf OCR tools return raw text without semantic understanding — they can read "Due: 30/06/2025" but cannot determine whether it is a due date or a service date, and they have no mechanism to flag ambiguity to a reviewer.

I set out to build a system that bridges AI extraction and human oversight: fast enough that AI does the heavy lifting, careful enough that a human stays in the loop where it counts.

---

## Approach

The core design principle was accuracy over automation. Rather than auto-approving AI output, the system always routes a freshly extracted invoice through a structured review step where a human can verify, edit, and explicitly approve or reject each result. The AI's job is to pre-fill the form accurately and flag its own uncertainty. The human's job is to catch what the AI cannot.

---

## What I Built

**Dual-mode PDF processing**
`pdfplumber` detects whether a PDF contains selectable text (digital) or is image-only (scanned) by checking whether the extracted character count exceeds a 100-character threshold. Digital PDFs have their text extracted and sent to GPT-4o as a text completion. Scanned PDFs are rendered to JPEG images at 200 DPI via `pdf2image` (poppler), resized to a 2048px maximum dimension, and sent to GPT-4o's vision endpoint. The same pipeline handles both document types without a separate OCR engine.

**AI confidence scoring per field**
The extraction prompt instructs GPT-4o to return a 0.0–1.0 confidence score for each of six fields (invoice number, vendor name, invoice date, due date, total amount, tax amount) with calibrated rules: 0.95–1.00 for unambiguously labeled fields, 0.60–0.79 for values inferred from context, 0.00–0.39 for absent or unreadable fields. These are the model's own uncertainty estimates returned in its JSON response — not heuristic scores computed after the fact. Overall confidence is also returned by the model. The backend flags any field with confidence below 0.75 for human attention.

**Validation pipeline with auto-retry**
Pydantic v2 validates the model's JSON response against a strict schema: non-negative amounts, three-character ISO currency codes, confidence values in [0, 1]. If validation fails, the system retries with the validation error appended to the prompt as a corrective hint. A separate sanity-check layer then flags semantic issues the schema cannot catch: tax amount exceeding the invoice total, due dates falling before invoice dates, invoice dates more than seven days in the future, and amounts outside plausible bounds.

**Human review workflow**
A split-panel UI shows the original PDF (via in-session blob URL) alongside fully editable extracted fields. Each field displays a per-field confidence badge and an inline warning banner for missing or low-confidence data. Reviewers can approve, save as draft, or reject with a written reason — all transitions persist in PostgreSQL with a `reviewed_at` timestamp and `reviewed_by` user reference.

A re-extract feature lets a reviewer re-upload the original PDF, triggering a second extraction. The result is displayed as a field-by-field diff (current value vs. new AI value), and the reviewer can selectively apply the AI value or keep the current value per field.

**Duplicate detection**
On every upload, the system computes a SHA-256 hash of the file bytes and checks for both exact-file duplicates (same hash) and logical duplicates (same vendor name + invoice number). If matches exist, the upload still proceeds but surfaces a warning dialog listing the conflicting invoices, preserving the user's ability to decide.

**Invoice library and export**
Invoices are stored in PostgreSQL with indexes on status, vendor name, invoice date, and file hash. The library supports free-text search (vendor name and invoice number via `ILIKE`), filter by status and date range, and sort by any column, with server-side pagination. CSV export uses Python's `csv` module. Excel export uses `openpyxl` with bold headers, auto-fitted column widths, and a frozen header row — no third-party conversion service involved.

**Cost transparency**
Token counts from each API call are read from the response's `usage` metadata and stored per invoice in PostgreSQL. The dashboard aggregates real USD cost (input tokens × $2.50/M + output tokens × $10.00/M for GPT-4o; $0.10/M + $0.40/M for Gemini) over the current and previous calendar months. These are calculated from actual token usage, not estimates or placeholders.

---

## Tech Decisions & Why

| Decision | Reasoning |
|---|---|
| FastAPI with async SQLAlchemy | Extraction is I/O-bound: wait for LLM API, then write to DB. Async keeps the server responsive under concurrent uploads without spawning threads. |
| Pydantic v2 + one auto-retry | LLMs occasionally return malformed JSON on ambiguous inputs. Rather than crashing, the system retries with the validation error as a corrective prompt. This handles the majority of failures without a second manual upload. |
| pdfplumber 100-char threshold for routing | Conservative: a PDF needs meaningful extracted text to route as digital. This avoids misclassifying low-text digital PDFs as scanned and sending them to the more expensive vision path. |
| GPT-4o as default (Gemini as configurable alternative) | The prompt asks the model to score its own uncertainty per field and explain ambiguities in natural language. Instruction-following quality matters more than raw cost here. Gemini 2.5 Flash is supported via `LLM_PROVIDER=gemini` for cost-sensitive deployments. |
| openpyxl for Excel, in-process | No managed conversion service. Avoids latency and the privacy concern of sending invoice data to a third-party API just to produce a spreadsheet. |
| SHA-256 file hash for duplicate detection | Deterministic, cheap, and collision-resistant at this scale. Catches exact re-uploads before LLM cost is incurred; vendor+invoice-number matching catches logical duplicates from re-scans. |

---

## Honest Limitations

- **No line items**: The extractor captures six header-level fields. Line-item extraction (description, quantity, unit price per row) would require a more complex prompt structure and a nested schema.
- **Scanned PDFs capped at 3 pages**: Only pages 1, 2, and the last page are rendered and sent to the vision model. Critical data on middle pages of a long multi-page scanned document will be missed.
- **Single shared workspace**: Auth is real (JWT-based registration and login, bcrypt password hashing, multiple accounts), but the invoice list and dashboard stats are not filtered by the logged-in user. Any authenticated account sees the full library. Per-user data isolation is not implemented.
- **PDFs not retained after upload session**: File bytes are discarded after extraction. The review screen shows a PDF preview using a browser blob URL, which is only available during the upload session. Re-extraction requires the user to re-upload the original file.
- **English-first**: Locale detection and date format disambiguation are implemented in the prompt, but the UI and extraction instructions are English-only.

---

## Outcome

A complete, deployable invoice processing application with a real extraction pipeline, structured validation, and a human-in-the-loop review flow. The system ships as a three-container Docker Compose setup (Next.js 15, FastAPI, PostgreSQL 16) and is configured for deployment on Render via a `render.yaml` blueprint.

The deeper value is the pattern: structured LLM prompting with explicit confidence instructions, Pydantic output validation with auto-retry, confidence-gated human review, duplicate prevention, and per-request cost tracking. That same pattern — extract structured fields from unstructured documents, validate, flag uncertainty, route to review — applies to contracts, receipts, medical records, shipping manifests, or any document type a client needs to process at scale.

---

**Stack**: Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui · FastAPI · SQLAlchemy 2.0 (async) · Alembic · Pydantic v2 · PostgreSQL 16 · OpenAI GPT-4o (or Gemini 2.5 Flash) · pdfplumber · pdf2image · openpyxl · Docker Compose
