"use client";

import { useState, useEffect, useCallback } from "react";
import Papa from "papaparse";

interface SyncMetadata {
  timestamp: string;
  emailsProcessed: number;
  attachmentsFound: number;
}

interface UploadMeta {
  id: string | null;
  recordCount: string | null;
  source: string | null;
  createdAt: string | null;
  fileName: string | null;
}

export type UploadState = "idle" | "uploading" | "success" | "error";

export interface UploadResult {
  state: UploadState;
  recordCount: number;
  fileName: string;
  error: string | null;
}

export function useBlobCsv(type: string, uploadId?: number) {
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"blob" | "upload" | "none">("none");
  const [syncInfo, setSyncInfo] = useState<SyncMetadata | null>(null);
  const [uploadMeta, setUploadMeta] = useState<UploadMeta | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploadResult, setLastUploadResult] = useState<UploadResult | null>(null);

  // Load data from server
  const loadFromServer = useCallback(async (specificId?: number) => {
    try {
      const csvUrl = specificId
        ? `/api/data?type=${type}&id=${specificId}`
        : `/api/data?type=${type}`;

      const csvRes = await fetch(csvUrl);

      if (csvRes.ok) {
        const csvText = await csvRes.text();
        const result = Papa.parse<Record<string, string>>(csvText, {
          header: true,
          skipEmptyLines: true,
        });
        if (result.data.length > 0) {
          setRawData(result.data);
          setSource("blob");
        }

        setUploadMeta({
          id: csvRes.headers.get("X-Upload-Id"),
          recordCount: csvRes.headers.get("X-Record-Count"),
          source: csvRes.headers.get("X-Upload-Source"),
          createdAt: csvRes.headers.get("X-Created-At"),
          fileName: csvRes.headers.get("X-File-Name"),
        });
      }
    } catch {
      // Failed to load from server
    }
  }, [type]);

  // Auto-load from server on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [, metaRes] = await Promise.all([
          loadFromServer(uploadId),
          fetch(`/api/data?type=sync-metadata`),
        ]);

        if (metaRes.ok) {
          const meta: SyncMetadata = await metaRes.json();
          setSyncInfo(meta);
        }
      } catch {
        // No data available
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [type, uploadId, loadFromServer]);

  // Upload file to server, then parse for display
  const handleFileUpload = useCallback(async (file: File): Promise<UploadResult> => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      const result: UploadResult = {
        state: "error",
        recordCount: 0,
        fileName: file.name,
        error: "Please upload a .csv file",
      };
      setUploadState("error");
      setUploadError(result.error);
      setLastUploadResult(result);
      return result;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const result: UploadResult = {
        state: "error",
        recordCount: 0,
        fileName: file.name,
        error: "File too large (max 10MB)",
      };
      setUploadState("error");
      setUploadError(result.error);
      setLastUploadResult(result);
      return result;
    }

    setUploadState("uploading");
    setUploadError(null);

    // Parse locally for immediate display
    let localRecordCount = 0;
    await new Promise<void>((resolve) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length === 0) {
            // Empty CSV
          } else {
            setRawData(results.data);
            setSource("upload");
            localRecordCount = results.data.length;
          }
          resolve();
        },
        error: () => resolve(),
      });
    });

    if (localRecordCount === 0) {
      const result: UploadResult = {
        state: "error",
        recordCount: 0,
        fileName: file.name,
        error: "CSV file is empty or could not be parsed",
      };
      setUploadState("error");
      setUploadError(result.error);
      setLastUploadResult(result);
      return result;
    }

    // Upload to server to persist
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setUploadMeta({
          id: String(json.uploadId),
          recordCount: String(json.recordCount),
          source: "manual",
          createdAt: new Date().toISOString(),
          fileName: file.name,
        });
        setSource("blob");

        const result: UploadResult = {
          state: "success",
          recordCount: json.recordCount || localRecordCount,
          fileName: file.name,
          error: null,
        };
        setUploadState("success");
        setLastUploadResult(result);
        return result;
      } else {
        const errorText = await res.text().catch(() => "Upload failed");
        let errorMsg = "Failed to save report to server";
        try {
          const errJson = JSON.parse(errorText);
          if (errJson.error) errorMsg = errJson.error;
        } catch {
          // use default error message
        }

        const result: UploadResult = {
          state: "error",
          recordCount: localRecordCount,
          fileName: file.name,
          error: errorMsg,
        };
        setUploadState("error");
        setUploadError(errorMsg);
        setLastUploadResult(result);
        return result;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error — data shown locally but not saved";
      const result: UploadResult = {
        state: "error",
        recordCount: localRecordCount,
        fileName: file.name,
        error: errorMsg,
      };
      setUploadState("error");
      setUploadError(errorMsg);
      setLastUploadResult(result);
      return result;
    }
  }, [type]);

  return {
    rawData,
    loading,
    source,
    syncInfo,
    uploadMeta,
    uploadState,
    uploadError,
    lastUploadResult,
    handleFileUpload,
  };
}
