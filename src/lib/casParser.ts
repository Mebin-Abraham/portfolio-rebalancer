import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
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