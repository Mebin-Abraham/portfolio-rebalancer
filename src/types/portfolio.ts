export type AssetBucket = 'equities' | 'debt' | 'commodities';
export type RebalanceMode = 'inflow_only' | 'full_rebalance';

export interface AssetAllocation {
  equities: number;
  debt: number;
  commodities: number;
}

export interface RebalanceRow {
  bucket: AssetBucket;
  label: string;
  currentValue: number;
  currentWeight: number;
  targetWeight: number;
  drift: number;
  isBreachingBand: boolean;
  recommendedTrade: number; // Positive = Buy, Negative = Sell
  postRebalanceWeight: number;
  status: 'OVERWEIGHT' | 'UNDERWEIGHT' | 'ON_TARGET';
  actionText: string;
}