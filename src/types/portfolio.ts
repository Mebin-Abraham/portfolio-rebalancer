export type AssetBucket = 'equities' | 'debt' | 'commodities';

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
  recommendedInflow: number;
  postInflowWeight: number;
  status: 'OVERWEIGHT' | 'UNDERWEIGHT' | 'ON_TARGET';
  actionText: string;
}