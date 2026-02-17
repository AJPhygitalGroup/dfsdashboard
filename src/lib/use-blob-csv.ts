"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";

export function useBlobCsv(type: string) {
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"blob" | "upload" | "none">("none");

  // Auto-load from Blob on mount
  useEffect(() => {
    fetch(`/api/data?type=${type}`)
      .then((res) => {
        if (!res.ok) throw new Error("No data");
        return res.text();
      })
      .then((csvText) => {
        const result = Papa.parse<Record<string, string>>(csvText, {
          header: true,
          skipEmptyLines: true,
        });
        if (result.data.length > 0) {
          setRawData(result.data);
          setSource("blob");
        }
      })
      .catch(() => {
        // No blob data available, user can upload manually
      })
      .finally(() => setLoading(false));
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

  return { rawData, loading, source, handleFileUpload };
}
