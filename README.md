# Zoe Screenshot

A high-performance, pixel-perfect website screenshot tool and API. Built with **Node.js**, **Express**, and **Puppeteer**.

![App Preview](public/preview.png)

## Features

- **Full-Page & Viewport Modes**: Capture the entire scrollable height or only the above-the-fold viewport.
- **Multiple Formats**: Export in **PNG** (lossless), **JPG** (customizable quality), and **WEBP** (modern, ultra-lightweight).
- **High-Resolution / Retina (1x, 2x, 3x)**: Crisp, razor-sharp output scaling (`deviceScaleFactor: 2` or `3`).
- **Device Presets**:
  - **Desktop**: 1920×1080 (FHD), 1440×900, 1280×800
  - **Tablet**: 820×1180 (iPad Air), 1024×1366 (iPad Pro)
  - **Mobile**: 393×852 (iPhone 15 Pro), 412×915 (Pixel), 375×667
  - **Custom**: Any user-defined width and height
- **Smart Auto-Scroll**: Scrolls through the page to trigger all lazy-loaded images, SVG animations, and web fonts before capturing.
- **Ad & Cookie Banner Removal**: Automatically injects stealth rules to eliminate GDPR overlays, OneTrust banners, and sticky ads.
- **Color Scheme Emulation**: Emulate Light or Dark mode (`prefers-color-scheme`).
- **Interactive Web App**:
  - Zoom in/out, fit to screen, actual size (100%).
  - One-click copy image directly to clipboard.
  - Direct download menu.
  - Recent screenshots gallery with click-to-load and deletion.
  - Quick demo shortcuts (`stripe.com`, `apple.com`, `github.com`, `vercel.com`).
- **Direct Streaming API**: Stream screenshots directly via URL parameters.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
The application will be live at `http://localhost:4000`.

For auto-reloading during development:
```bash
npm run dev
```

---

## API Reference

### 1. Capture Screenshot (JSON Response)
`POST /api/screenshot`

#### Request Body (JSON):
```json
{
  "url": "https://stripe.com",
  "width": 1920,
  "height": 1080,
  "format": "webp",
  "quality": 85,
  "fullPage": true,
  "scale": 2,
  "delay": 1000,
  "blockBanners": true,
  "colorScheme": "dark",
  "isMobile": false
}
```

#### Response (JSON):
```json
{
  "success": true,
  "data": {
    "id": "3e86aef4a4bbf2fac494245b",
    "url": "https://stripe.com/",
    "filename": "screenshot-3e86aef4a4bbf2fac494245b.webp",
    "width": 1920,
    "height": 4820,
    "effectiveWidth": 3840,
    "effectiveHeight": 9640,
    "scale": 2,
    "format": "webp",
    "quality": 85,
    "fullPage": true,
    "sizeBytes": 421000,
    "sizeFormatted": "411.13 KB",
    "durationMs": 3450,
    "downloadUrl": "/api/download/screenshot-3e86aef4a4bbf2fac494245b.webp",
    "viewUrl": "/storage/screenshots/screenshot-3e86aef4a4bbf2fac494245b.webp"
  }
}
```

---

### 2. Direct Streaming Image API
`GET /api/screenshot/direct`

Embed screenshots directly into `<img>` tags or download instantly:

```html
<img src="http://localhost:3000/api/screenshot/direct?url=https://github.com&format=webp&scale=2&fullPage=true" alt="GitHub Screenshot" />
```

#### Query Parameters:
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `url` | String | **Required** | Target website URL (e.g. `https://apple.com`) |
| `format` | String | `png` | Image format: `png`, `jpg`, `webp` |
| `quality` | Number | `90` | Image compression quality (1-100, for JPG/WEBP) |
| `fullPage` | Boolean | `true` | Capture full scrollable page (`true` / `false`) |
| `scale` | Number | `2` | Device pixel ratio: `1` (standard), `2` (Retina), `3` (Ultra HD) |
| `width` | Number | `1920` | Viewport width in pixels |
| `height` | Number | `1080` | Viewport height in pixels |
| `delay` | Number | `0` | Extra wait time in milliseconds before snapshot |
| `blockBanners` | Boolean | `true` | Strip cookie notices & GDPR banners (`true` / `false`) |
| `colorScheme` | String | `no-preference` | `dark`, `light`, or `no-preference` |
| `isMobile` | Boolean | `false` | Emulate mobile touch & mobile User-Agent |

---

### 3. Recent History
`GET /api/history` - Returns list of recent captures.  
`DELETE /api/history/:id` - Deletes a capture from history and disk.

---

## Testing

Run test suite:
```bash
npm test
```
Or test all formats:
```bash
node test/test-formats.js
```

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Headless Engine**: Puppeteer with Google Chrome / Chromium
- **Frontend**: Vanilla HTML5, Modern CSS Design System, ES Modules JavaScript
- **Fonts & Icons**: Google Fonts (Outfit, Plus Jakarta Sans, JetBrains Mono), Phosphor Icons
