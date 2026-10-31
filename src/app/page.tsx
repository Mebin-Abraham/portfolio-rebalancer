"use client";

import React, { useState, useMemo } from "react";
import { calculateCashflowRebalance } from "@/lib/rebalancer";
import { AssetAllocation } from "@/types/portfolio";

export default function HomePage() {
  // 1. Current Holdings (Defaulted to your 86% / 10% / 4% drifted example = ₹10L)
  const [holdings, setHoldings] = useState<AssetAllocation>({
    equities: 860000,
    debt: 100000,
    commodities: 40000,
  });

  // 2. Target Risk Appetite (80% Equity, 15% Debt, 5% Gold/Silver)
  const [targets, setTargets] = useState<AssetAllocation>({
    equities: 80,
    debt: 15,
    commodities: 5,
  });

  // 3. Fresh Monthly SIP / Inflow to deploy
  const [monthlyInflow, setMonthlyInflow] = useState<number>(50000);

  const targetSum = targets.equities + targets.debt + targets.commodities;
  const totalPortfolio = holdings.equities + holdings.debt + holdings.commodities;

  const rows = useMemo(
    () => calculateCashflowRebalance(holdings, targets, monthlyInflow),
    [holdings, targets, monthlyInflow]
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Smart Cash-Flow Portfolio Rebalancer
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Fix portfolio drift using fresh inflows first — zero forced sales, zero tax drag.
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl text-right">
            <span className="text-xs text-slate-400 block">Current Portfolio Value</span>
            <span className="text-xl font-bold text-emerald-400">
              ₹{totalPortfolio.toLocaleString("en-IN")}
            </span>
          </div>
        </header>

        {/* Controls Grid: Holdings & Risk Targets */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Current Portfolio Values */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">
              1. Your Current Holdings (₹)
            </h2>
            {(["equities", "debt", "commodities"] as const).map((key) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <label className="text-sm text-slate-300 capitalize w-32">{key}</label>
                <input
                  type="number"
                  step={5000}
                  value={holdings[key]}
                  onChange={(e) =>
                    setHoldings({ ...holdings, [key]: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>

          {/* Card 2: Target Risk Appetite */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-white">
                2. Target Risk Appetite (%)
              </h2>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  targetSum === 100
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-rose-950 text-rose-400 border border-rose-800"
                }`}
              >
                Total: {targetSum}% {targetSum !== 100 && "(Must equal 100%)"}
              </span>
            </div>

            {(["equities", "debt", "commodities"] as const).map((key) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <label className="text-sm text-slate-300 capitalize w-32">{key} (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={targets[key]}
                  onChange={(e) =>
                    setTargets({ ...targets, [key]: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Card 3: Monthly Inflow Slider */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-base font-semibold text-white">
              3. Fresh Monthly SIP / Lumpsum Available to Invest
            </label>
            <span className="text-xl font-bold text-blue-400">
              ₹{monthlyInflow.toLocaleString("en-IN")}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={250000}
            step={5000}
            value={monthlyInflow}
            onChange={(e) => setMonthlyInflow(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>₹0</span>
            <span>₹50,000</span>
            <span>₹1,25,000</span>
            <span>₹2,50,000</span>
          </div>
        </section>

        {/* Card 4: Actionable Rebalance Output Table */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-base font-semibold text-white">
              Action Plan (Post-Inflow Portfolio: ₹{(totalPortfolio + monthlyInflow).toLocaleString("en-IN")})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4">Asset Class</th>
                  <th className="p-4">Current Weight</th>
                  <th className="p-4">Target</th>
                  <th className="p-4">Drift</th>
                  <th className="p-4">Fresh Inflow Routing</th>
                  <th className="p-4">New Weight</th>
                  <th className="p-4">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row) => (
                  <tr key={row.bucket} className="hover:bg-slate-800/40">
                    <td className="p-4 font-medium text-white">
                      {row.label}
                      <span className="block text-xs text-slate-400">
                        ₹{row.currentValue.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="p-4">{row.currentWeight}%</td>
                    <td className="p-4">{row.targetWeight}%</td>
                    <td className="p-4 font-semibold">
                      <span
                        className={
                          row.drift > 1
                            ? "text-amber-400"
                            : row.drift < -1
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }
                      >
                        {row.drift > 0 ? `+${row.drift}%` : `${row.drift}%`}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-blue-400">
                      +₹{row.recommendedInflow.toLocaleString("en-IN")}
                    </td>
                    <td className="p-4 font-medium text-emerald-400">
                      {row.postInflowWeight}%
                    </td>
                    <td className="p-4 text-xs text-slate-300">{row.actionText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}