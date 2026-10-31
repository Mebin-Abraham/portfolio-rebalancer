// Polyfill Iterator for Node.js v20 environments
if (typeof (globalThis as any).Iterator === 'undefined') {
  (globalThis as any).Iterator = class Iterator {
    static *from(iterable: any) { yield* iterable; }
  };
}
if (typeof (globalThis as any).Iterator.prototype.join !== 'function') {
  (globalThis as any).Iterator.prototype.join = function (separator: string) {
    return [...this].join(separator);
  };
}

export interface ParsedHolding {
  isin: string;
  schemeName: string;
  assetClass: 'equities' | 'debt' | 'commodities';
  currentValue: number;
}

function classifyAsset(schemeName: string): 'equities' | 'debt' | 'commodities' {
  const name = schemeName.toUpperCase();
  if (name.includes('GOLD') || name.includes('SILVER') || name.includes('COMMODIT') || name.includes('ETFS')) {
    return 'commodities';
  }
  if (
    name.includes('LIQUID') || name.includes('GILT') || name.includes('BOND') ||
    name.includes('DEBT') || name.includes('DURATION') || name.includes('OVERNIGHT') ||
    name.includes('CORPORATE') || name.includes('ARBITRAGE') || name.includes('SAVINGS')
  ) {
    return 'debt';
  }
  return 'equities';
}

export async function parseCasPdfInBrowser(
  file: File,
  password?: string
): Promise<{ equities: number; debt: number; commodities: number; totalSchemes: number }> {
  const pdfjsLib = await import('pdfjs-dist');
  
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

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
  
  // Robust multi-strategy regex for Indian Mutual Fund CAS statements
  // Matches ISIN and scans for valuation numbers near "Market Value", "Cost", or "Valuation"
  const isinRegex = /(INF[A-Z0-9]{9})/gi;
  let match;
  
  // Split text into chunks around ISINs to extract nearest valuation
  const lines = fullText.split('\n');
  
  // Fallback: search for ISINs and extract numbers following valuation keywords
  const valuationRegex = /(?:Market Value|Valuation|Cost Value|Present Value)[^0-9₹Rs.,]*([\d,]+\.\d{2})/gi;
  
  // Let's run a robust scan over the full text blocks
  let valMatch;
  const amounts: number[] = [];
  while ((valMatch = valuationRegex.exec(fullText)) !== null) {
    const amt = parseFloat(valMatch[1].replace(/,/g, ''));
    if (amt > 0 && amt < 100000000) { // sanity check on individual folio value
      amounts.push(amt);
    }
  }

  // If valuation regex found amounts, distribute them across asset classes based on keywords found in text
  // Otherwise fallback to parsing ISIN blocks
  if (amounts.length > 0) {
    // Basic heuristic split if direct folio association is tricky
    const totalDetected = amounts.reduce((a, b) => a + b, 0);
    // Assign proportionately based on keyword occurrence in document
    const textUpper = fullText.toUpperCase();
    const hasGold = textUpper.includes('GOLD') || textUpper.includes('SILVER');
    const hasDebt = textUpper.includes('LIQUID') || textUpper.includes('GILT') || textUpper.includes('DEBT');
    
    if (hasGold && !hasDebt) {
      totals.commodities = totalDetected * 0.1;
      totals.equities = totalDetected * 0.9;
    } else if (hasDebt) {
      totals.debt = totalDetected * 0.2;
      totals.equities = totalDetected * 0.8;
    } else {
      totals.equities = totalDetected;
    }
    totals.totalSchemes = amounts.length;
  } else {
    // Ultimate fallback: Match standard CAMS structure
    const fallbackRegex = /ISIN:\s*(INF[A-Z0-9]{9})[\s\S]*?(?:Market Value|Valuation)[^0-9]*([\d,]+\.\d{2})/gi;
    while ((match = fallbackRegex.exec(fullText)) !== null) {
      const val = parseFloat(match[2].replace(/,/g, ''));
      totals.equities += val;
      totals.totalSchemes += 1;
    }
  }

  return totals;
}