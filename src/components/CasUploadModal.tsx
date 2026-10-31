"use client";

import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { AssetAllocation } from '@/types/portfolio';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface CasUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsed: (holdings: AssetAllocation) => void;
}

export interface ParsedHolding {
  isin: string;
  schemeName: string;
  assetClass: 'equities' | 'debt' | 'commodities';
  currentValue: number;
}

function classifyAsset(schemeName: string): 'equities' | 'debt' | 'commodities' {
  const name = schemeName.toUpperCase();
  if (name.includes('GOLD') || name.includes('SILVER') || name.includes('COMMODIT')) {
    return 'commodities';
  }
  if (
    name.includes('LIQUID') || name.includes('GILT') || name.includes('BOND') ||
    name.includes('DEBT') || name.includes('DURATION') || name.includes('OVERNIGHT') ||
    name.includes('CORPORATE') || name.includes('ARBITRAGE')
  ) {
    return 'debt';
  }
  return 'equities';
}

export async function parseCasPdfInBrowser(
  file: File,
  password?: string
): Promise<{ equities: number; debt: number; commodities: number; totalSchemes: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, password });
  const pdf = await loadingTask.promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageLines = content.items.map((item: any) => item.str).join(' ');
    fullText += pageLines + '\n';
  }

  const totals = { equities: 0, debt: 0, commodities: 0, totalSchemes: 0 };
  const isinRegex = /(INF[A-Z0-9]{9})[\s\S]*?Closing Unit Balance:\s*([\d,.]+)[\s\S]*?(?:Market Value|Valuation)[^₹\d]*([\d,]+\.\d{2})/gi;

  let match;
  while ((match = isinRegex.exec(fullText)) !== null) {
    const currentValue = parseFloat(match[3].replace(/,/g, ''));
    const snippetStart = Math.max(0, match.index - 120);
    const rawTitle = fullText.slice(snippetStart, match.index).split('\n').pop()?.trim() || 'Mutual Fund Scheme';

    if (currentValue > 0) {
      const assetClass = classifyAsset(rawTitle);
      totals[assetClass] += currentValue;
      totals.totalSchemes += 1;
    }
  }

  return totals;
}


export default function CasUploadModal({ isOpen, onClose, onParsed }: CasUploadModalProps) {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<File | null>(null);

  if (!isOpen) return null;

  async function handleFile(file: File) {
    fileRef.current = file;
    setStatus('parsing');
    setErrorMsg('');
    try {
      const result = await parseCasPdfInBrowser(file, password || undefined);
      onParsed({ equities: result.equities, debt: result.debt, commodities: result.commodities });
      setStatus('done');
      onClose();
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to parse PDF.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold text-white">Import CAS PDF Statement</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <p className="text-xs text-slate-400">
          Upload your CAMS or KFintech CAS PDF. It is parsed entirely in your browser — nothing is uploaded.
        </p>

        <input
          type="password"
          placeholder="PDF password (if any)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-6 cursor-pointer hover:border-blue-500 transition">
          <span className="text-2xl mb-1">📄</span>
          <span className="text-sm text-slate-300">Click to select PDF</span>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />
        </label>

        {status === 'parsing' && <p className="text-xs text-blue-400 text-center">Parsing PDF…</p>}
        {status === 'error' && <p className="text-xs text-rose-400 text-center">{errorMsg}</p>}
      </div>
    </div>
  );
}
