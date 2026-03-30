"use client";

import { useState, useRef, useCallback } from "react";
import type { UploadState } from "@/lib/use-blob-csv";

interface CsvUploadZoneProps {
  label: string;
  uploadState: UploadState;
  onFileSelect: (file: File) => void;
  /** Optional: hint text below the label */
  hint?: string;
  /** Compact mode for inline use */
  compact?: boolean;
}

export default function CsvUploadZone({
  label,
  uploadState,
  onFileSelect,
  hint,
  compact = false,
}: CsvUploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so re-uploading same file works
    e.target.value = "";
  }, [handleFile]);

  const isUploading = uploadState === "uploading";

  const borderColor = dragging
    ? "border-blue-400 bg-blue-50"
    : uploadState === "success"
    ? "border-green-300 bg-green-50"
    : uploadState === "error"
    ? "border-red-300 bg-red-50"
    : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100";

  if (compact) {
    return (
      <div>
        <label className="block text-sm font-medium mb-1">{label}</label>
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isUploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${borderColor} ${
            isUploading ? "opacity-60 cursor-wait" : ""
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            className="hidden"
            disabled={isUploading}
          />
          <div className="flex items-center gap-2">
            {isUploading ? (
              <Spinner />
            ) : (
              <span className="text-gray-400 text-sm">CSV</span>
            )}
            <span className="text-sm text-gray-500 truncate flex-1">
              {isUploading
                ? "Uploading..."
                : fileName
                ? fileName
                : "Drop CSV or click to browse"}
            </span>
          </div>
        </div>
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-4 sm:p-5 cursor-pointer transition-colors ${borderColor} ${
        isUploading ? "opacity-60 cursor-wait" : ""
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleInputChange}
        className="hidden"
        disabled={isUploading}
      />
      <div className="flex flex-col items-center text-center gap-1.5">
        {isUploading ? (
          <>
            <Spinner />
            <p className="text-sm text-gray-500">Uploading {fileName}...</p>
          </>
        ) : (
          <>
            <p className="text-2xl">{dragging ? "\u{1F4E5}" : "\u{1F4C4}"}</p>
            <p className="text-sm font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-400">
              {dragging ? "Drop file here" : "Drag & drop a CSV or click to browse"}
            </p>
            {fileName && uploadState !== "idle" && (
              <p className="text-xs text-gray-500 mt-1 truncate max-w-[250px]">
                Last: {fileName}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
