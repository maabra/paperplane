# Paperplane Poster Studio

A buildless browser-based poster maker. Serve `dist/` with any static web server.

## Current refinement

The editor starts in **Simple editor** mode: edit the main message and supporting details, choose a design, change the picture, and download. Optional prices are folded away. Text wraps and scales automatically inside measured layout regions. The download dialog uses plain-language format and quality choices. **Advanced editor** retains selection, transforms, graphics, grouping, and layers, with clearer navigation. Mobile includes shortcuts between words, preview, and designs.

There are now **12 layout families across 18 categories (216 starting variants)**, plus 171 SVG assets and 25 bundled sample photographs. Six additional compositions explore centered editorial layouts, split panels, full-frame photographs, information boards, layered arrangements, and bold announcements. Category-specific palettes and photography replace the generic illustrations in the expanded catalog. Sample photography is replaceable; text and other graphic layers remain editable.

The prompt engine includes **384 curated phrases**, existing category keywords, common spelling corrections, and English/Croatian terms. Live suggestions appear while typing. It extracts explicit prices/currencies, dates, locations, email addresses, websites, and common phone formats, prioritizing a new price over an old price. Matching and extraction are local heuristics rather than general AI understanding. Input is normalized, length-limited, and stripped of HTML and invisible control characters; previews use escaped text or DOM text nodes.

`text-layout.js` shares measured wrapping between new templates and subsequent edits. It preserves ordinary whole words, breaks oversized unbroken strings, fits font size to the available width/height, and keeps optional cleared text empty. A reset-layout action preserves the words and picture and supports Undo. Older active layouts are backed up in the project library before the visual refresh. Custom layouts opened afterward are retained and can be reset explicitly.

The interface uses a bright pastel vaporwave / 90s desktop theme, with retro window panels, offset shadows, and a subtle animated gradient backdrop with floating rings and sparkles. The header's motion button pauses the background and remembers the preference. System reduced-motion settings disable the animations automatically. The theme styles the app interface; poster artwork and exported files retain their chosen colors.

The current design system follows editorial, photographic, organic, typographic, collage, and modular-grid poster references. There are 36 category/style presets with individually editable compositions, embedded sample photography, organic photo masks, outlined typography, badges, squiggles, and graphic motifs. The direction picker displays real poster previews. The editor has an optional wireframe-model view and preserves masks and positioning when replacing photos. Existing drafts from the older design system are backed up in browser storage before switching to the new layouts.

## Features

The expanded studio includes 18 poster categories and 216 starting presets, with 171 searchable SVG assets. The first six general categories remain the starting point; Explore all types opens the full catalog. Category search and weighted keyword matching cover sports, property, hiring, wellness, education, causes, cinema, art, travel, services, notices, and menus. Matching descriptions also show alternative categories. New categories use relevant vector artwork rather than unrelated sample photographs.

Artwork supports collection filters, keyword search, favorites, and paginated rendering. Custom SVGs up to 2 MB can be imported as layers and ungrouped. Imports accept basic SVG shapes, paths, text, gradients, clips, and embedded raster images. Active content, CSS styles, and external resources are rejected before rendering.

Shift-click on the canvas or in Layers selects multiple elements. Move, align, distribute, duplicate, or delete a selection; group it to stretch or rotate it together. Grouped text keeps its connection to the Details fields. Snapping is optional, Alt bypasses it, and editor grid guides do not appear in downloads. Zoom ranges from 50% to 200%, with a scrollable canvas viewport. The shortcut dialog lists the additional keyboard controls.

Paper formats include A3, A4, A5, US Letter, square, landscape, story, social portrait, and custom dimensions from 30 to 1000 mm per side. SVG exports remain scalable. PNG and JPEG exports offer 72, 150, or 300 DPI and cap the longest raster edge at 10,000 pixels. Print / PDF uses a vector print sheet with the selected physical page size and the browser's print dialog.

Projects supports named designs and copies in IndexedDB, plus editable `.paperplane.json` downloads and imports. Portable files deduplicate image assets; imported projects are validated before entering the canvas. The current draft autosaves with a short debounce and flushes when leaving the page. Saved projects stay in the current browser; download a project file for backup or transfer. Named projects can hold larger data than the browser's small localStorage draft allowance.

Six general categories, six directions per category, twelve editable poster layouts, weighted keyword matching, decimal price extraction, original searchable SVG artwork, custom colors and typography, A4/A3/square formats, local photo uploads, browser draft saving, vector SVG export, and high-resolution PNG export.

Every poster is made of independent layers. Select text, illustrations, photos, borders, decorations, or the background. Drag to move, use side or corner handles to stretch, and use the top handle to rotate. Hold Shift while resizing to keep proportions or while rotating to snap to 15 degrees. The Selected tab provides exact coordinates, dimensions, opacity, individual fill and outline colors, font settings, flipping, and alignment. Add multiple text blocks, shapes, SVG illustrations, and photos. Ungroup SVG artwork to edit its constituent parts. Layers can be reordered, duplicated, hidden, locked, or deleted. The background starts locked and can be unlocked in Layers or Selected.

Use arrow keys to move a selected element (Shift for 10 units), Ctrl/Cmd+D to duplicate, Delete to remove, and Ctrl/Cmd+Z or Ctrl/Cmd+Shift+Z to undo or redo. Each of the six layouts preserves its edits when switching looks. Drafts and both exports preserve transforms and layers; download files omit editor handles.

The recommendation engine is deterministic and runs locally. It recognizes English keywords; unsupported descriptions can use manual category selection. Photos and drafts stay in browser storage. Drafts are limited to one per browser. PNG exports use sRGB; professional CMYK, bleed, PDF, and AI language understanding are outside this version.

## Preview

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4173.

## Verification

With Python Playwright and Chromium available, run `python verify.py`, `python verify_canvas.py`, `python verify_designs.py`, `python verify_studio.py`, and `python verify_refinement.py` against the running preview. These exercise the category flow, price parsing, canvas dragging/stretching/rotation, individual layer editing, locking and stacking, SVG ungrouping, keyboard shortcuts, photo masks and replacement, model previews, exports, persistence, photo upload, mobile interaction, multiple selection, grouping, snapping, zoom, custom sizes, JPEG dimensions, artwork favorites, project storage/import, SVG import validation, grouped text, and print sheets. The design check produces local contact sheets for visual review. See `ASSETS.md` for photo sources.
