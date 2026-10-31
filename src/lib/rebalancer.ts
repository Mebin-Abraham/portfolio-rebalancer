import { AssetAllocation, AssetBucket, RebalanceRow } from '@/types/portfolio';

const BUCKET_LABELS: Record<AssetBucket, string> = {
  equities: 'Equities (Stocks & Equity MF)',
  debt: 'Debt (Liquid, Gilt & Bonds)',
  commodities: 'Precious Metals (Gold & Silver)',
};

export function calculateCashflowRebalance(
  currentValues: AssetAllocation,
  targetPercentages: AssetAllocation, // e.g., { equities: 80, debt: 15, commodities: 5 }
  monthlyInflow: number
): RebalanceRow[] {
  const buckets: AssetBucket[] = ['equities', 'debt', 'commodities'];
  const currentTotal = buckets.reduce((sum, b) => sum + currentValues[b], 0);
  const projectedTotal = currentTotal + monthlyInflow;

  // Step 1: Calculate rupee shortfall against post-inflow target size
  const shortfalls: Record<AssetBucket, number> = { equities: 0, debt: 0, commodities: 0 };
  let totalShortfall = 0;

  for (const b of buckets) {
    const targetDecimal = targetPercentages[b] / 100;
    const idealPostValue = projectedTotal * targetDecimal;
    const deficit = Math.max(0, idealPostValue - currentValues[b]);
    shortfalls[b] = deficit;
    totalShortfall += deficit;
  }

  // Step 2: Route fresh inflow proportionally into underweight buckets only
  return buckets.map((b) => {
    const curVal = currentValues[b];
    const curWeight = currentTotal > 0 ? (curVal / currentTotal) * 100 : 0;
    const tgtWeight = targetPercentages[b];
    const drift = curWeight - tgtWeight;

    const allocatedInflow =
      totalShortfall > 0 ? Math.round((shortfalls[b] / totalShortfall) * monthlyInflow) : 0;

    const newVal = curVal + allocatedInflow;
    const postInflowWeight = projectedTotal > 0 ? (newVal / projectedTotal) * 100 : 0;

    let status: RebalanceRow['status'] = 'ON_TARGET';
    if (drift > 1.0) status = 'OVERWEIGHT';
    if (drift < -1.0) status = 'UNDERWEIGHT';

    let actionText = 'Hold current position';
    if (allocatedInflow > 0) {
      actionText = `Buy ₹${allocatedInflow.toLocaleString('en-IN')} via fresh inflow`;
    } else if (status === 'OVERWEIGHT') {
      actionText = 'Pause fresh SIPs (Hold to avoid capital gains tax)';
    }

    return {
      bucket: b,
      label: BUCKET_LABELS[b],
      currentValue: curVal,
      currentWeight: Number(curWeight.toFixed(1)),
      targetWeight: tgtWeight,
      drift: Number(drift.toFixed(1)),
      recommendedInflow: allocatedInflow,
      postInflowWeight: Number(postInflowWeight.toFixed(1)),
      status,
      actionText,
    };
  });
}