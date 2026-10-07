# Topbin Artwork

Artwork JPG Exporter for Topbin bin panels.

A single-page web app that converts Illustrator (.ai) and PDF artwork into JPG files, entirely in the browser. Nothing is uploaded.

## What it does

- Opens PDF-compatible .ai files and PDFs (plus PNG, JPG, WebP and SVG images).
- Shows every artboard with its size in mm.
- Exports at 72, 150, 300 DPI or a custom DPI, with adjustable JPG quality and background colour.
- Exports one JPG per artboard (a .zip when there are several), or a layout sheet with all artboards side by side and their mm sizes.
- **Photo to flat artwork:** drop a photo of a bin and click *Rebuild clean artwork (AI)*. the AI reads each printed panel and redraws it as flat, editable artwork at the panel size you set (default 370 × 770 mm). The export switches to a layout sheet with mm labels.
- **Edit text & colours:** finds the text lines (including outlined text) and flat colour shapes on each artboard. You can type replacement text, recolour shapes or remove lines, and duplicate an artboard to make new variants.

## Use it

Open `index.html` in a browser, or enable GitHub Pages for this repo.

## AI setup (Vercel)

The photo rebuild calls `api/rebuild.js`, a Vercel function. In the Vercel project, open **Settings > Environment Variables** and add one key, then redeploy:

- `GEMINI_API_KEY`: a Google AI key from aistudio.google.com (uses `gemini-2.5-pro`; set `GEMINI_MODEL` to change it), or
- `ANTHROPIC_API_KEY`: a Claude key from console.anthropic.com (uses `claude-opus-5-5`).

With both set, `AI_PROVIDER` (`gemini` or `claude`) picks one; otherwise Gemini is used. Without a key, everything else still works and the rebuild button explains what is missing.

## Files

- `index.html` is the full app, with the PDFium WebAssembly and a sample file embedded.
- `api/rebuild.js` is the Vercel function for the photo rebuild.
- `src.html` is the same app without the embedded data (placeholders `__SAMPLE_B64__` and `__PDFIUM_GZ_B64__`). `build.py` produces `index.html` from it.

## Notes

- .ai files must be saved with "Create PDF Compatible File" ticked.
- Rendering uses PDFium (via `@embedpdf/pdfium`) for Adobe-like CMYK colours, with pdf.js as a fallback.
- Outlined text can't be re-typed in its original font, so replacement text uses a font you pick (Open Sans Bold is the closest match).
