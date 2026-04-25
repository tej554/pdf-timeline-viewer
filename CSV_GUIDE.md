# CSV Builder Guide

This guide walks you through creating a categories file for the PDF Timeline Viewer from scratch. No coding knowledge required.

---

## What the file does

The categories file tells the viewer:
- **What to call** each swimlane row
- **Which pages** belong to that row
- **What colour** to use for those page blocks
- **What date range** (optional) to show under the label

---

## Step 1 — Choose your colours

Pick one colour per category from the palette below. Copy the hex code exactly (including the `#`) into your file.

| Colour Name | Hex Code | Preview | Good for |
|-------------|----------|---------|----------|
| Ocean Blue | `#2E75B6` | 🟦 | Main sections, primary parties |
| Emerald Green | `#27AE60` | 🟩 | Approvals, certificates, positive outcomes |
| Amber | `#E67E22` | 🟧 | Pending items, mutations, changes |
| Crimson | `#E74C3C` | 🟥 | Disputed items, urgent, critical |
| Violet | `#8E44AD` | 🟪 | Background context, supporting records |
| Teal | `#1ABC9C` | 🩵 | Evidence, forensic, technical docs |
| Gold | `#F1C40F` | 🟨 | Key dates, highlights, summaries |
| Rose | `#E91E63` | 🌸 | Secondary parties, correspondence |

> Use each colour only once. If you have more than 8 categories, you can reuse a colour but the swimlanes will look the same — consider merging smaller categories instead.

---

## Step 2 — Identify your page groups

Open your PDF and note which pages belong together. Ask yourself:

- Does this group of pages share a topic, party, or document type?
- What would I label this group?
- What date or time period do these pages cover?

Write these down before opening a spreadsheet.

**Example — a court case PDF (9 pages):**

| Group | Pages | Notes |
|-------|-------|-------|
| Land Records | 1 | Original ownership document |
| Legal Heir Certificate | 2 | Issued Jun 2009 |
| Revenue / Mutation | 3, 8 | Mutation entries |
| Court Filings | 4, 5, 7 | Petitions and orders |
| Forensic Evidence | 6 | Expert report |
| Case Summary | 9 | Final judgment |

---

## Step 3 — Build the file

### Option A: Using a spreadsheet (Excel / Google Sheets — recommended)

1. Open Excel or Google Sheets
2. In **row 1**, type these exact headers in columns A–D:

   | A | B | C | D |
   |---|---|---|---|
   | `category` | `color` | `pages` | `date_range` |

3. Fill one row per category from row 2 onwards:

   | category | color | pages | date_range |
   |----------|-------|-------|------------|
   | Land Records | `#2E75B6` | `1` | `Aug 1986` |
   | Legal Heir Certificate | `#27AE60` | `2` | `Jun 2009` |
   | Revenue / Mutation | `#8E44AD` | `3,8` | `Jun 2009 – Apr 2021` |
   | Court Filings | `#E67E22` | `4,5,7` | `Sep 2009 – Nov 2019` |
   | Forensic Evidence | `#1ABC9C` | `6` | `Jun 2013` |
   | Case Summary | `#F1C40F` | `9` | `2024` |

4. Save as **CSV (comma-delimited)** or **Excel (.xlsx)** — both work.

> **Google Sheets:** File → Download → Comma Separated Values (.csv)
> **Excel:** File → Save As → CSV UTF-8

---

### Option B: Using a plain text editor (Notepad / TextEdit)

1. Open Notepad (Windows) or TextEdit (Mac — set to plain text mode)
2. Type or paste the following, replacing the example data with your own:

```
category,color,pages,date_range
Land Records,#2E75B6,"1","Aug 1986"
Legal Heir Certificate,#27AE60,"2","Jun 2009"
Revenue / Mutation,#8E44AD,"3,8","Jun 2009 – Apr 2021"
Court Filings,#E67E22,"4,5,7","Sep 2009 – Nov 2019"
Forensic Evidence,#1ABC9C,"6","Jun 2013"
Case Summary,#F1C40F,"9","2024"
```

3. Save the file with a `.csv` extension (e.g. `my_categories.csv`)

> **Important:** Wrap the `pages` and `date_range` values in double quotes if they contain commas, e.g. `"4,5,7"` not `4,5,7`.

---

## Page number formats

You can use any combination of individual pages and ranges in the `pages` column:

| What you want | How to write it |
|---------------|-----------------|
| Single page | `5` |
| A few separate pages | `4,5,7` |
| A continuous range | `10-20` |
| Mixed | `1,3,10-15,22` |
| Everything in one section | `"4,5,7,10-15"` (use quotes if comma-separated) |

---

## Date range formats

The `date_range` column is optional and purely for display — the viewer does not parse or sort by dates. Write whatever label is meaningful to you:

| Example | Result shown |
|---------|-------------|
| `Aug 1986` | Aug 1986 |
| `Jun 2009 – Apr 2021` | Jun 2009 – Apr 2021 |
| `2024` | 2024 |
| `Q1 2023` | Q1 2023 |
| *(leave blank)* | Nothing shown |

---

## Common mistakes to avoid

| Mistake | What goes wrong | Fix |
|---------|----------------|-----|
| Column header typo (e.g. `Category` with capital C) | App shows "Missing column" error | Use all lowercase: `category`, `color`, `pages` |
| Color without `#` (e.g. `2E75B6`) | Color ignored, falls back to grey | Always include `#`: `#2E75B6` |
| Pages not quoted when comma-separated | Only first page number read | Wrap in quotes: `"4,5,7"` |
| Extra spaces in header (e.g. ` color `) | Column not recognised | Remove leading/trailing spaces |
| Wrong file extension | App refuses the file | Save as `.csv`, `.xlsx`, or `.xls` only |

---

## Template

Copy this template and fill in your own data:

```csv
category,color,pages,date_range
Category 1,#2E75B6,"1","Date or range"
Category 2,#27AE60,"2-5","Date or range"
Category 3,#E67E22,"6,8,10","Date or range"
Category 4,#E74C3C,"7,9","Date or range"
Category 5,#8E44AD,"11-15","Date or range"
Category 6,#1ABC9C,"16","Date or range"
```

A ready-to-use example file is in the `sample/` folder:
- `sample/sample.csv` — generic document
- `sample/PDF2_Disputed_Inheritance_Court_Case.csv` — legal court case

---

## Quick checklist before loading

- [ ] File saved as `.csv`, `.xlsx`, or `.xls`
- [ ] First row has exactly: `category`, `color`, `pages`, `date_range`
- [ ] Every colour starts with `#` and is 7 characters (e.g. `#2E75B6`)
- [ ] Page numbers with commas are wrapped in quotes
- [ ] No empty rows in the middle of the data
- [ ] Each category has at least one valid page number
