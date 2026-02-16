"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";

interface FileUploaderProps {
  onInspectionsLoaded: (data: Record<string, string>[]) => void;
  onDefectsLoaded: (data: Record<string, string>[]) => void;
  onWorkOrdersLoaded: (data: Record<string, string>[]) => void;
}

export default function FileUploader({
  onInspectionsLoaded,
  onDefectsLoaded,
  onWorkOrdersLoaded,
}: FileUploaderProps) {
  const [status, setStatus] = useState<Record<string, string>>({});

  const handleFile = useCallback(
    (
      file: File,
      type: string,
      callback: (data: Record<string, string>[]) => void
    ) => {
      setStatus((prev) => ({ ...prev, [type]: "loading" }));
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          callback(results.data as Record<string, string>[]);
          setStatus((prev) => ({
            ...prev,
            [type]: `Loaded ${results.data.length} records`,
          }));
        },
        error: () => {
          setStatus((prev) => ({ ...prev, [type]: "Error parsing file" }));
        },
      });
    },
    []
  );

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4 text-[#1a3a5f]">
        Upload CSV Files
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Inspection Data
          </label>
          <input
            type="file"
            accept=".csv"
            className="block w-full text-sm border rounded p-2"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "inspections", onInspectionsLoaded);
            }}
          />
          {status.inspections && (
            <p className="text-xs mt-1 text-green-600">{status.inspections}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Defects Data
          </label>
          <input
            type="file"
            accept=".csv"
            className="block w-full text-sm border rounded p-2"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "defects", onDefectsLoaded);
            }}
          />
          {status.defects && (
            <p className="text-xs mt-1 text-green-600">{status.defects}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Work Orders Data
          </label>
          <input
            type="file"
            accept=".csv"
            className="block w-full text-sm border rounded p-2"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "work_orders", onWorkOrdersLoaded);
            }}
          />
          {status.work_orders && (
            <p className="text-xs mt-1 text-green-600">{status.work_orders}</p>
          )}
        </div>
      </div>
    </div>
  );
}
