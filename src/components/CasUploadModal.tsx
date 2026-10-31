"use client";

import React, { useState } from "react";
import { AssetAllocation } from "@/types/portfolio";
import { parseStatementText } from "@/lib/casParser";

interface CasUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsed: (holdings: AssetAllocation) => void;
}

export default function CasUploadModal({ isOpen, onClose, onParsed }: CasUploadModalProps) {
  const [tab, setTab] = useState<"pdf" | "text">("pdf");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleProcessPdf() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const { parseCasPdfInBrowser } = await import("@/lib/casParser");
      const result = await parseCasPdfInBrowser(file, password || undefined);
      onParsed({
        equities: Math.round(result.equities),
        debt: Math.round(result.debt),
        commodities: Math.round(result.commodities),
      });
      setLoading(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to decrypt PDF. Try the 'Paste Text' tab above.");
      setLoading(false);
    }
  }

  function handleProcessText() {
    if (!rawText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = parseStatementText(rawText);
      onParsed({
        equities: Math.round(result.equities),
        debt: Math.round(result.debt),
        commodities: Math.round(result.commodities),
      });
      setLoading(false);
      onClose();
    } catch (err: any) {
      setError("Could not parse text. Ensure summary values are included.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 text-slate-100 shadow-2xl">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Import Statement Holdings</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setTab("pdf")}
            className={`py-2 text-xs font-semibold rounded-lg transition ${
              tab === "pdf" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Upload CAS PDF
          </button>
          <button
            onClick={() => setTab("text")}
            className={`py-2 text-xs font-semibold rounded-lg transition ${
              tab === "text" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Paste Statement Text (100% Reliable)
          </button>
        </div>

        {tab === "pdf" ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Upload your password-protected CAMS / CDSL / NSDL CAS PDF statement.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">PDF Password (PAN in CAPS)</label>
              <input
                type="password"
                placeholder="e.g., ABCDE1234F"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Select CAS PDF File</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Open your PDF statement, copy the summary text (e.g. CDSL Demat Accounts 65,956.44, Mutual Fund Folios 40,614.16), and paste it below:
            </p>
            <textarea
              rows={5}
              placeholder="Paste text here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800">
            Cancel
          </button>
          {tab === "pdf" ? (
            <button
              onClick={handleProcessPdf}
              disabled={!file || loading}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Parsing..." : "Import PDF"}
            </button>
          ) : (
            <button
              onClick={handleProcessText}
              disabled={!rawText.trim() || loading}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Import Text Data"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}