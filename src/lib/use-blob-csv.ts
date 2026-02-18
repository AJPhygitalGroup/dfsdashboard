"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";

interface SyncMetadata {
  timestamp: string;
  emailsProcessed: number;
  attachmentsFound: number;
}

export function useBlobCsv(type: string) {
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"blob" | "upload" | "none">("none");
  const [syncInfo, setSyncInfo] = useState<SyncMetadata | null>(null);

  // Auto-load from Blob on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch CSV data and sync metadata in parallel
        const [csvRes, metaRes] = await Promise.all([
          fetch(`/api/data?type=${type}`),
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
  }, [type]);

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

  return { rawData, loading, source, syncInfo, handleFileUpload };
}
