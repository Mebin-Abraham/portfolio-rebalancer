import { AssetAllocation, AssetBucket, RebalanceMode, RebalanceRow } from '@/types/portfolio';

const BUCKET_LABELS: Record<AssetBucket, string> = {
  equities: 'Equities (Stocks & Equity MF)',
  debt: 'Debt (Liquid, Gilt & Bonds)',
  commodities: 'Precious Metals (Gold & Silver)',
};

export function calculateCashflowRebalance(
  currentValues: AssetAllocation,
  targetPercentages: AssetAllocation,
  monthlyInflow: number,
  mode: RebalanceMode = 'inflow_only',
  toleranceBandPercent: number = 5.0
): RebalanceRow[] {
  const buckets: AssetBucket[] = ['equities', 'debt', 'commodities'];
  const currentTotal = buckets.reduce((sum, b) => sum + currentValues[b], 0);
  const projectedTotal = currentTotal + monthlyInflow;

  const shortfalls: Record<AssetBucket, number> = { equities: 0, debt: 0, commodities: 0 };
  let totalShortfall = 0;

  for (const b of buckets) {
    const idealPostValue = projectedTotal * (targetPercentages[b] / 100);
    const deficit = Math.max(0, idealPostValue - currentValues[b]);
    shortfalls[b] = deficit;
    totalShortfall += deficit;
  }

  return buckets.map((b) => {
    const curVal = currentValues[b];
    const curWeight = currentTotal > 0 ? (curVal / currentTotal) * 100 : 0;
    const tgtWeight = targetPercentages[b];
    const drift = curWeight - tgtWeight;
    const isBreachingBand = Math.abs(drift) >= toleranceBandPercent;

    let recommendedTrade = 0;
    const idealPostValue = projectedTotal * (tgtWeight / 100);

    if (mode === 'inflow_only') {
      recommendedTrade =
        totalShortfall > 0 ? Math.round((shortfalls[b] / totalShortfall) * monthlyInflow) : 0;
    } else {
      recommendedTrade = Math.round(idealPostValue - curVal);
    }

    const newVal = curVal + recommendedTrade;
    const postRebalanceWeight = projectedTotal > 0 ? (newVal / projectedTotal) * 100 : 0;

    let status: RebalanceRow['status'] = 'ON_TARGET';
    if (drift > 1.0) status = 'OVERWEIGHT';
    if (drift < -1.0) status = 'UNDERWEIGHT';

    let actionText = 'Within target corridor — Hold';
    if (recommendedTrade > 0) {
      actionText = `BUY ₹${recommendedTrade.toLocaleString('en-IN')}`;
    } else if (recommendedTrade < 0) {
      actionText = `SELL ₹${Math.abs(recommendedTrade).toLocaleString('en-IN')} & reinvest in underweight`;
    } else if (status === 'OVERWEIGHT' && mode === 'inflow_only') {
      actionText = 'Pause fresh SIPs (Hold to avoid capital gains tax)';
    }

    return {
      bucket: b,
      label: BUCKET_LABELS[b],
      currentValue: curVal,
      currentWeight: Number(curWeight.toFixed(1)),
      targetWeight: tgtWeight,
      drift: Number(drift.toFixed(1)),
      isBreachingBand,
      recommendedTrade,
      postRebalanceWeight: Number(postRebalanceWeight.toFixed(1)),
      status,
      actionText,
    };
  });
}