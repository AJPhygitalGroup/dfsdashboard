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

  // Auto-load from Blob on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const csvUrl = uploadId
          ? `/api/data?type=${type}&id=${uploadId}`
          : `/api/data?type=${type}`;

        // Fetch CSV data and sync metadata in parallel
        const [csvRes, metaRes] = await Promise.all([
          fetch(csvUrl),
          fetch(`/api/data?type=sync-metadata`),
        ]);

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

          // Extract upload metadata from headers
          setUploadMeta({
            id: csvRes.headers.get("X-Upload-Id"),
            recordCount: csvRes.headers.get("X-Record-Count"),
            source: csvRes.headers.get("X-Upload-Source"),
            createdAt: csvRes.headers.get("X-Created-At"),
            fileName: csvRes.headers.get("X-File-Name"),
          });
        }

        if (metaRes.ok) {
          const meta: SyncMetadata = await metaRes.json();
          setSyncInfo(meta);
        }
      } catch {
        // No blob data available, user can upload manually
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [type, uploadId]);

  const handleFileUpload = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setRawData(results.data);
        setSource("upload");
      },
    });
  };

  return { rawData, loading, source, syncInfo, uploadMeta, handleFileUpload };
}
