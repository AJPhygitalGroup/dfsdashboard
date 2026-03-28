"use client";

import { useState, useEffect, useCallback } from "react";

export interface UploadRecord {
  id: number;
  type: string;
  blob_url: string;
  file_name: string;
  record_count: number;
  uploaded_by: number | null;
  upload_source: "manual" | "email-sync";
  file_size_bytes: number | null;
  created_at: string;
}

export function useUploadHistory(type?: string) {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPage = useCallback(
    async (offset = 0, limit = 20) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
        });
        if (type) params.set("type", type);

        const res = await fetch(`/api/uploads?${params}`);
        if (res.ok) {
          const json = await res.json();
          setUploads(json.uploads);
          setTotal(json.total);
        }
      } catch {
        // Failed to fetch history
      } finally {
        setLoading(false);
      }
    },
    [type]
  );

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  return { uploads, total, loading, fetchPage };
}
