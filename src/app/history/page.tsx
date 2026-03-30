"use client";

import { useState, useEffect, useCallback } from "react";

interface UploadRecord {
  id: number;
  type: string;
  file_name: string;
  record_count: number;
  uploaded_by: number | null;
  upload_source: "manual" | "email-sync";
  file_size_bytes: number | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  inspections: "Inspections",
  defects: "Defects",
  work_orders: "Work Orders",
};

const TYPE_COLORS: Record<string, string> = {
  inspections: "bg-blue-100 text-blue-800",
  defects: "bg-amber-100 text-amber-800",
  work_orders: "bg-green-100 text-green-800",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HistoryPage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [downloading, setDownloading] = useState<number | null>(null);
  const limit = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
      });
      if (filterType !== "all") params.set("type", filterType);

      const res = await fetch(`/api/uploads?${params}`);
      if (res.ok) {
        const json = await res.json();
        setUploads(json.uploads);
        setTotal(json.total);
      }
    } catch {
      // Failed to fetch
    } finally {
      setLoading(false);
    }
  }, [filterType, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [filterType]);

  const totalPages = Math.ceil(total / limit);

  const handleDownload = async (upload: UploadRecord) => {
    setDownloading(upload.id);
    try {
      const res = await fetch(`/api/data?id=${upload.id}`);
      if (res.ok) {
        const csvText = await res.text();
        const blob = new Blob([csvText], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = upload.file_name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Download failed
    } finally {
      setDownloading(null);
    }
  };

  const handleView = (upload: UploadRecord) => {
    const typeRoute: Record<string, string> = {
      inspections: "/inspections",
      defects: "/defects",
      work_orders: "/work-orders",
    };
    const route = typeRoute[upload.type];
    if (route) {
      window.location.href = `${route}?uploadId=${upload.id}`;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#1a3a5f]">
              Upload History
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {total} report{total !== 1 ? "s" : ""} uploaded
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Filter:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm"
            >
              <option value="all">All Types</option>
              <option value="inspections">Inspections</option>
              <option value="defects">Defects</option>
              <option value="work_orders">Work Orders</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : uploads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No uploads found. Upload a CSV from any dashboard page to get started.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">ID</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Type</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">File Name</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Records</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Size</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Source</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Uploaded At</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-mono">#{u.id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[u.type] || "bg-gray-100 text-gray-800"}`}>
                          {TYPE_LABELS[u.type] || u.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">
                        {u.file_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.record_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500">{formatBytes(u.file_size_bytes)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.upload_source === "email-sync"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {u.upload_source === "email-sync" ? "Email Sync" : "Manual"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleView(u)}
                            className="text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDownload(u)}
                            disabled={downloading === u.id}
                            className="text-xs px-2.5 py-1 rounded bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium transition-colors disabled:opacity-50"
                          >
                            {downloading === u.id ? "..." : "Download"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {uploads.map((u) => (
                <div key={u.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[u.type] || "bg-gray-100 text-gray-800"}`}>
                      {TYPE_LABELS[u.type] || u.type}
                    </span>
                    <span className="text-xs text-gray-400">#{u.id}</span>
                  </div>
                  <p className="font-medium text-gray-800 text-sm truncate">{u.file_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{u.record_count} records</span>
                    <span>{formatBytes(u.file_size_bytes)}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      u.upload_source === "email-sync"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {u.upload_source === "email-sync" ? "Sync" : "Manual"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(u.created_at)}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleView(u)}
                      className="flex-1 text-xs py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDownload(u)}
                      disabled={downloading === u.id}
                      className="flex-1 text-xs py-1.5 rounded bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium disabled:opacity-50"
                    >
                      {downloading === u.id ? "..." : "Download"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <p className="text-xs text-gray-500">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 rounded text-sm border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded text-sm border bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
