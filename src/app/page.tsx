"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { Download, UploadCloud, Image as ImageIcon, FileImage, ShieldCheck, Activity, Atom } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TargetFormat = "original" | "image/webp" | "image/jpeg";

interface CompressedResult {
  file: File;
  url: string;
  sizeMB: number;
  reductionPercentage: number;
}

interface OriginalFile {
  file: File;
  url: string;
  sizeMB: number;
}

export default function NucleusOptimizer() {
  const [originalFile, setOriginalFile] = useState<OriginalFile | null>(null);
  const [compressedResult, setCompressedResult] = useState<CompressedResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [maxSizeMB, setMaxSizeMB] = useState<number>(1);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>("image/webp");

  const [mode, setMode] = useState<"smart" | "target_size">("smart");
  const [targetSizeKB, setTargetSizeKB] = useState<number | ''>(500);

  // Handle Drag and Drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];

    // 5. File Size Ceiling (DoS Guard)
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > 25) {
      alert("Asset exceeds maximum local infrastructure limit of 25MB");
      return;
    }

    const url = URL.createObjectURL(file);

    // 6. Extreme Dimension Check (Image Bomb Guard)
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          if (img.naturalWidth > 8000 || img.naturalHeight > 8000) {
            reject(new Error("dimensions_exceeded"));
          } else {
            resolve();
          }
        };
        img.onerror = () => {
          reject(new Error("invalid_image"));
        };
        img.src = url;
      });
    } catch (err: any) {
      URL.revokeObjectURL(url);
      if (err.message === "dimensions_exceeded") {
        alert("Image dimensions exceed maximum processing bounds (8,000px).");
      } else {
        console.error(err);
        alert("An error occurred while processing your image. Please check the asset and try again.");
      }
      return;
    }

    // 7. Memory Leak Prevention (Object URL Cleanup)
    setOriginalFile((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return { file, url, sizeMB };
    });
    setCompressedResult((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
  });

  // Process Image
  const processImage = useCallback(async () => {
    if (!originalFile) return;

    setIsProcessing(true);
    try {
      const options: any = {
        maxWidthOrHeight: 3840,
        useWebWorker: true,
      };

      if (mode === "target_size") {
        const kb = typeof targetSizeKB === 'number' ? targetSizeKB : 500;
        options.maxSizeMB = kb / 1024;
      } else {
        options.maxSizeMB = maxSizeMB;
        options.fileType = targetFormat !== "original" ? targetFormat : originalFile.file.type;
      }

      const compressedBlob = await imageCompression(originalFile.file, options);
      
      let extension = originalFile.file.name.split('.').pop() || "";
      if (mode === "smart" && targetFormat === "image/webp") extension = "webp";
      else if (mode === "smart" && targetFormat === "image/jpeg") extension = "jpg";

      const newFileName = `nucleus-optimized-${originalFile.file.name.replace(/\.[^/.]+$/, "")}.${extension}`;
      
      const compressedFileObj = new File([compressedBlob], newFileName, { type: compressedBlob.type });
      
      const compressedSizeMB = compressedFileObj.size / 1024 / 1024;
      const reduction = ((originalFile.sizeMB - compressedSizeMB) / originalFile.sizeMB) * 100;

      setCompressedResult({
        file: compressedFileObj,
        url: URL.createObjectURL(compressedFileObj),
        sizeMB: compressedSizeMB,
        reductionPercentage: reduction > 0 ? reduction : 0,
      });
    } catch (error) {
      console.error(error);
      alert("An error occurred while processing your image. Please check the asset and try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [originalFile, maxSizeMB, targetFormat, mode, targetSizeKB]);

  // Trigger compression when file or settings change (debounced for slider)
  const timeoutRef = useRef<NodeJS.Timeout>(null);
  useEffect(() => {
    if (originalFile) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        processImage();
      }, 500);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [originalFile, maxSizeMB, targetFormat, mode, targetSizeKB, processImage]);

  // Clean up Object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (originalFile?.url) URL.revokeObjectURL(originalFile.url);
      if (compressedResult?.url) URL.revokeObjectURL(compressedResult.url);
    };
  }, []);

  const handleDownload = () => {
    if (!compressedResult) return;
    const link = document.createElement("a");
    link.href = compressedResult.url;
    link.download = compressedResult.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSize = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(1)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  // Common Card/Panel Classes
  const panelClass = "bg-slate-900/60 backdrop-blur-md border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.05)] rounded-xl";
  const telemetryLabelClass = "font-mono tracking-wider uppercase text-xs text-slate-500 flex items-center gap-2";

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#0B0F19] text-slate-200 selection:bg-cyan-500/30 relative overflow-hidden">
      
      {/* Deep Space / Sci-Fi Radial Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#0B0F19]/80 to-[#0B0F19] pointer-events-none -z-10" />
      {/* Optional faint grid overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoNiwxODIsMjEyLDAuMSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none -z-10 opacity-30" />
      
      {/* Navbar */}
      <header className="border-b border-cyan-500/20 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <Atom className="text-cyan-400 animate-pulse w-8 h-8 mr-3" />
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Nucleus
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <span className={cn(telemetryLabelClass, "text-emerald-400/80")}>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </span>
            <a
              href="https://digitalheroesco.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono tracking-wider text-cyan-400 border border-cyan-500/30 bg-cyan-950/10 hover:bg-cyan-500/20 hover:text-cyan-300 px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.05)] hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              Built for Digital Heroes
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex flex-col lg:flex-row gap-8 z-10 relative">
        
        {/* Left Column: Input & Controls */}
        <section className="flex-1 flex flex-col gap-6">
          
          {/* Dropzone */}
          <div 
            {...getRootProps()} 
            className={cn(
              "border-2 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[300px] relative overflow-hidden group",
              isDragActive 
                ? "border-solid border-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-[1.02]" 
                : "border-dashed border-cyan-500/30 bg-cyan-950/10 hover:border-cyan-400/80 hover:bg-cyan-900/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            )}
          >
            <input {...getInputProps()} />
            
            {/* Animated Grid Scan Line (Decorative) */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent h-full w-full opacity-0 group-hover:opacity-100 group-hover:animate-[scan_3s_ease-in-out_infinite]" />
            
            <div className="bg-slate-900/80 p-4 rounded-xl mb-4 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)] relative z-10">
              <UploadCloud className={cn("w-10 h-10 text-cyan-400", isDragActive && "animate-pulse")} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white relative z-10">
              {isDragActive ? "Drop image to start optimization" : "Drag & Drop Image"}
            </h3>
            {!isDragActive && (
              <p className="text-slate-400 font-mono text-xs uppercase tracking-widest max-w-sm relative z-10 mt-2">
                [ PNG / JPEG / WEBP ]
              </p>
            )}
          </div>

          {/* Controls */}
          <div className={cn(panelClass, "p-8 flex flex-col gap-8")}>
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">
                  {mode === "smart" ? "Smart Optimizer" : "File Size Compressor"}
                </h2>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-[#0B0F19]/80 p-1 rounded-lg border border-cyan-500/10">
              <button
                onClick={() => setMode("smart")}
                className={cn(
                  "flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200",
                  mode === "smart" 
                    ? "bg-cyan-950/50 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]" 
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                )}
              >
                Smart Optimize
              </button>
              <button
                onClick={() => setMode("target_size")}
                className={cn(
                  "flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200",
                  mode === "target_size" 
                    ? "bg-cyan-950/50 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]" 
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                )}
              >
                Manual Compress
              </button>
            </div>
            
            {mode === "smart" ? (
              <>
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-slate-100">
                      Target Max Size
                    </label>
                    <span className="text-cyan-400 font-mono bg-cyan-950/50 border border-cyan-500/20 px-2 py-1 rounded text-xs">
                      [ {maxSizeMB.toFixed(1)} MB ]
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="10" 
                    step="0.1" 
                    value={maxSizeMB} 
                    onChange={(e) => setMaxSizeMB(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer hover:shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-shadow"
                  />
                </div>

                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <label className="text-sm font-semibold text-slate-100">
                    Output Format
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "original", label: "Original" },
                      { value: "image/webp", label: "WebP" },
                      { value: "image/jpeg", label: "JPEG" },
                    ].map((fmt) => (
                      <button
                        key={fmt.value}
                        onClick={() => setTargetFormat(fmt.value as TargetFormat)}
                        className={cn(
                          "py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 border",
                          targetFormat === fmt.value 
                            ? "bg-cyan-950/50 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]" 
                            : "bg-[#0B0F19]/50 border-cyan-500/10 text-slate-400 hover:border-cyan-500/30 hover:text-slate-200"
                        )}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                <label className="text-sm font-semibold text-slate-100">
                  Max File Size Limit (KB)
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    value={targetSizeKB}
                    onChange={(e) => setTargetSizeKB(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-lg px-4 py-3 pr-12 outline-none text-slate-100 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="e.g. 500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500 text-xs font-mono tracking-widest uppercase">
                    KB
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase leading-relaxed mt-1">
                  {">"} Compresses the image below the target limit while preserving its original file format.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Analytics & Preview */}
        <section className="flex-[1.5] flex flex-col gap-6">
          <div className={cn(panelClass, "p-8 flex flex-col gap-6 min-h-[600px] relative")}>
            
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-3">
                <FileImage className="w-5 h-5 text-cyan-400" />
                Analytics Dashboard
              </h2>
              {isProcessing && (
                <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-400 animate-pulse uppercase">
                  <span className="text-cyan-500">{"["}</span> PROCESSING <span className="text-cyan-500">{"]"}</span>
                </div>
              )}
            </div>

            {!originalFile ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 z-10">
                <div className="w-24 h-24 mb-6 rounded-full bg-slate-900/50 border border-cyan-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.05)]">
                  <ImageIcon className="w-10 h-10 text-cyan-500/30" />
                </div>
                <p className="text-lg font-medium text-slate-300">No Image Selected</p>
                <p className="text-sm mt-2 text-slate-500">Upload a file to view compression analytics.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-8 z-10 flex-1">
                
                {/* Visual Comparison Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  
                  {/* Original */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-100">Original</span>
                      <span className="text-cyan-500/80 font-mono text-xs">{"["} {formatSize(originalFile.sizeMB)} {"]"}</span>
                    </div>
                    <div className="relative aspect-square rounded-lg overflow-hidden border border-cyan-500/10 bg-[#0B0F19] group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={originalFile.url} alt="Original" className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100" />
                    </div>
                    <div className="text-xs font-mono text-slate-400 truncate px-1" title={originalFile.file.name}>
                      {originalFile.file.name}
                    </div>
                  </div>

                  {/* VS Badge */}
                  <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900 border border-cyan-500/30 rounded-md items-center justify-center text-xs font-mono font-bold text-cyan-400 z-10 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    VS
                  </div>

                  {/* Optimized */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-400">Optimized</span>
                      <span className="text-emerald-400/80 font-mono text-xs">{"["} {compressedResult ? formatSize(compressedResult.sizeMB) : "---"} {"]"}</span>
                    </div>
                    <div className="relative aspect-square rounded-lg overflow-hidden border border-emerald-500/30 bg-[#0B0F19] shadow-[0_0_20px_rgba(16,185,129,0.05)] group">
                      {compressedResult ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={compressedResult.url} alt="Optimized" className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-950/10 animate-pulse">
                          <ImageIcon className="w-10 h-10 text-emerald-500/30" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-mono text-emerald-400/80 truncate px-1" title={compressedResult?.file.name || "Processing..."}>
                      {compressedResult?.file.name || "AWAITING_RENDER..."}
                    </div>
                  </div>
                </div>

                {/* Metrics & Action */}
                <div className="mt-auto pt-6 border-t border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                  
                  {/* Metrics */}
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-400 mb-1">File Size Reduction</span>
                      <span className="text-3xl font-bold text-emerald-400 tracking-tight font-mono">
                        {compressedResult ? `${compressedResult.reductionPercentage.toFixed(1)}%` : "0.0%"}
                      </span>
                    </div>
                    {compressedResult && (
                      <div className="text-xs font-mono text-slate-500 border-l border-cyan-500/20 pl-6 py-1 flex flex-col gap-1">
                        <span className="line-through">{formatSize(originalFile.sizeMB)}</span>
                        <span className="text-emerald-400">{"->"} {formatSize(compressedResult.sizeMB)}</span>
                      </div>
                    )}
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={handleDownload}
                    disabled={!compressedResult || isProcessing}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 px-8 py-3 rounded-lg font-bold text-sm transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  >
                    <Download className="w-5 h-5" />
                    {mode === "smart" ? "Download Optimized Image" : "Download Compressed Image"}
                  </button>
                </div>

              </div>
            )}

          </div>
        </section>
      </main>

      {/* Credentials Footer */}
      <footer className="mt-auto relative z-10 w-full py-4 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-4 text-xs font-mono text-slate-700">
          <span>Mohammed Moinuddin Shaikh</span>
          <span className="opacity-50">|</span>
          <a href="mailto:s.moinuddin.dev@gmail.com" className="hover:text-cyan-400 transition-colors">
            s.moinuddin.dev@gmail.com
          </a>
        </div>
      </footer>

    </div>
  );
}
