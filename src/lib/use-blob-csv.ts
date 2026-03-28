"use client";

import { useState, useEffect } from "react";
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

export function useBlobCsv(type: string, uploadId?: number) {
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"blob" | "upload" | "none">("none");
  const [syncInfo, setSyncInfo] = useState<SyncMetadata | null>(null);
  const [uploadMeta, setUploadMeta] = useState<UploadMeta | null>(null);

  // Load data from server
  const loadFromServer = async (specificId?: number) => {
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
  };

  // Auto-load from Blob on mount
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
        // No blob data available
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [type, uploadId]);

  // Upload file to server (persists to Blob + DB), then parse for display
  const handleFileUpload = async (file: File) => {
    // Immediately parse for display
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setRawData(results.data);
        setSource("upload");
      },
    });

    // Upload to server in background to persist
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
      }
    } catch {
      // Upload to server failed, but local data is still displayed
    }
  };

  return { rawData, loading, source, syncInfo, uploadMeta, handleFileUpload };
}
