import { AssetAllocation, RebalanceMode } from '@/types/portfolio';

const STORAGE_KEY = 'rebalancer_portfolio_state_v1';

export interface SavedPortfolioState {
  holdings: AssetAllocation;
  targets: AssetAllocation;
  monthlyInflow: number;
  mode: RebalanceMode;
  toleranceBand: number;
}

export function loadSavedPortfolio(): SavedPortfolioState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedPortfolioState) : null;
  } catch {
    return null;
  }
}

export function savePortfolioState(state: SavedPortfolioState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}