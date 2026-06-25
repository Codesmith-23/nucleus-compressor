# Nucleus // Client-Side Image Optimizer & Compressor

Nucleus is a high-performance, futuristic image processing console built entirely on the client side. Designed to balance sleek cyberpunk aesthetics with high-efficiency utility, Nucleus allows users to instantly optimize images or forcefully compress them below strict target thresholds without changing their native file formats or leaking raw assets to an external server.

## 🚀 Live Demo
[Insert Your Vercel Live Deployment URL Here]

## ⚡ Features
- **Smart Optimize Mode:** Losslessly packs pixels and strips metadata payloads to reduce overhead cleanly.
- **File Size Compressor Mode:** Enforces a rigid manual maximum file limit (KB) to meet platform constraints, ensuring files stay strictly below the target limit.
- **Format Preservation:** Keeps original file mime-types completely intact (PNG remains PNG, JPEG remains JPEG) instead of forcing aggressive WebP conversions.
- **Cyberpunk Operator Console UI:** High-contrast tactical telemetry, crisp monospace layouts, and an atomic-pulsing engine interface engineered with Tailwind CSS.

## 🛡️ 7-Point Hardening & Resource Architecture
Nucleus is engineered to adhere to strict production-grade client security and browser environment stability protocols:

1. **XSS Metadata Defenses:** Strict reliance on native React state text interpolation to automatically HTML-escape asset strings, preventing malicious EXIF/metadata cross-site scripting vectors.
2. **State Isolation:** Complete component memory localization via `useState`. The engine is completely isolated from URL manipulation or query-string poison injections.
3. **Error Message Sanitization:** Execution flows are isolated inside try/catch wrappers that map detailed stack traces safely to internal development logs while outputting sanitized, human-friendly feedback strings to the client view.
4. **Thread-Safe Web Workers:** Offloads resource-heavy mathematical pixel manipulations off the main browser UI thread using isolated web workers to prevent browser layout freezing.
5. **Infrastructure DoS Ceilings:** Implements a hard 25MB raw asset block directly inside the dropzone loop to intercept system strain before engine computation.
6. **Pixel-Bomb OOM Guardrail:** Evaluates dimensions on memory allocation; assets exceeding a 8,000px boundary matrix are safely rejected to completely prevent browser Out-Of-Memory tab crashing.
7. **Active Garbage Collection Memory Leak Fix:** Prevents RAM bloat over heavy usage loops by explicitly calling `URL.revokeObjectURL()` on previous image preview blobs right before fresh encoding batches.

## 🛠️ Tech Stack
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS
- **Core Engine:** browser-image-compression
- **Icons:** Lucide React

## 📦 Local Installation & Development

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Codesmith-23/nucleus-compressor.git](https://github.com/Codesmith-23/nucleus-compressor.git)
   cd nucleus-compressor
   
2. **Install dependencies:**
   ```bash
   npm install
   
3. **Run the development server:**
  ```bash
  npm run dev

