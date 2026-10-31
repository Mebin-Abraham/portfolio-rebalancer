"use client";

import React, { useState, useEffect, useMemo } from "react";
import { calculateCashflowRebalance } from "@/lib/rebalancer";
import { loadSavedPortfolio, savePortfolioState } from "@/lib/storage";
import { AssetAllocation, RebalanceMode } from "@/types/portfolio";

const DEFAULT_HOLDINGS: AssetAllocation = { equities: 860000, debt: 100000, commodities: 40000 };
const DEFAULT_TARGETS: AssetAllocation = { equities: 80, debt: 15, commodities: 5 };

export default function HomePage() {
  const [holdings, setHoldings] = useState<AssetAllocation>(DEFAULT_HOLDINGS);
  const [targets, setTargets] = useState<AssetAllocation>(DEFAULT_TARGETS);
  const [monthlyInflow, setMonthlyInflow] = useState<number>(50000);
  const [mode, setMode] = useState<RebalanceMode>("inflow_only");
  const [toleranceBand, setToleranceBand] = useState<number>(5.0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load saved state from browser localStorage on startup
  useEffect(() => {
    const saved = loadSavedPortfolio();
    if (saved) {
      setHoldings(saved.holdings);
      setTargets(saved.targets);
      setMonthlyInflow(saved.monthlyInflow);
      setMode(saved.mode);
      setToleranceBand(saved.toleranceBand);
    }
    setIsLoaded(true);
  }, []);

  // Automatically save whenever user changes any input
  useEffect(() => {
    if (!isLoaded) return;
    savePortfolioState({ holdings, targets, monthlyInflow, mode, toleranceBand });
  }, [holdings, targets, monthlyInflow, mode, toleranceBand, isLoaded]);

  const targetSum = targets.equities + targets.debt + targets.commodities;
  const totalPortfolio = holdings.equities + holdings.debt + holdings.commodities;

  const rows = useMemo(
    () => calculateCashflowRebalance(holdings, targets, monthlyInflow, mode, toleranceBand),
    [holdings, targets, monthlyInflow, mode, toleranceBand]
  );

  function handleResetDemo() {
    setHoldings(DEFAULT_HOLDINGS);
    setTargets(DEFAULT_TARGETS);
    setMonthlyInflow(50000);
    setMode("inflow_only");
    setToleranceBand(5.0);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Smart Cash-Flow Portfolio Rebalancer
              </h1>
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded-full">
                Auto-Saved Locally
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Fix portfolio drift using fresh inflows first — or switch to full buy/sell rebalance.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleResetDemo}
              className="text-xs text-slate-400 hover:text-white border border-slate-800 px-3 py-2 rounded-lg"
            >
              Reset Demo
            </button>
            <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl text-right">
              <span className="text-xs text-slate-400 block">Current Portfolio Value</span>
              <span className="text-xl font-bold text-emerald-400">
                ₹{totalPortfolio.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </header>

        {/* Mode Selector & Drift Tolerance Band */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Rebalancing Strategy Mode
            </label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setMode("inflow_only")}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                  mode === "inflow_only"
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                Inflow Only (Zero Tax / No Sales)
              </button>
              <button
                onClick={() => setMode("full_rebalance")}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                  mode === "full_rebalance"
                    ? "bg-amber-600 text-white border-amber-500"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                Full Rebalance (Sell & Reinvest)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Drift Tolerance Band (Corridor)
              </label>
              <span className="text-sm font-bold text-amber-400">±{toleranceBand}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={toleranceBand}
              onChange={(e) => setToleranceBand(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-xs text-slate-500">
              Alerts trigger when an asset drifts by more than ±{toleranceBand}% from target.
            </p>
          </div>
        </section>

        {/* Controls Grid: Holdings & Risk Targets */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">1. Your Current Holdings (₹)</h2>
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

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-white">2. Target Risk Appetite (%)</h2>
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

        {/* Monthly Inflow Slider */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-base font-semibold text-white">
              3. Fresh Monthly SIP / Capital Available to Deploy
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
        </section>

        {/* Actionable Rebalance Output Table */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-base font-semibold text-white">
              Action Plan (Post-Rebalance Portfolio: ₹{(totalPortfolio + monthlyInflow).toLocaleString("en-IN")})
            </h2>
            <span className="text-xs text-slate-400">
              Mode: {mode === "inflow_only" ? "Cash-Flow Only (No Sells)" : "Full Exact Rebalance"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4">Asset Class</th>
                  <th className="p-4">Current</th>
                  <th className="p-4">Target</th>
                  <th className="p-4">Drift</th>
                  <th className="p-4">Trade Needed</th>
                  <th className="p-4">New Weight</th>
                  <th className="p-4">Action Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((row) => (
                  <tr key={row.bucket} className="hover:bg-slate-800/40">
                    <td className="p-4 font-medium text-white">
                      <div className="flex items-center gap-2">
                        {row.label}
                        {row.isBreachingBand && (
                          <span className="text-[10px] bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-full">
                            Breached ±{toleranceBand}%
                          </span>
                        )}
                      </div>
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
                    <td
                      className={`p-4 font-bold ${
                        row.recommendedTrade > 0
                          ? "text-blue-400"
                          : row.recommendedTrade < 0
                          ? "text-rose-400"
                          : "text-slate-500"
                      }`}
                    >
                      {row.recommendedTrade > 0
                        ? `+₹${row.recommendedTrade.toLocaleString("en-IN")}`
                        : row.recommendedTrade < 0
                        ? `-₹${Math.abs(row.recommendedTrade).toLocaleString("en-IN")}`
                        : "₹0"}
                    </td>
                    <td className="p-4 font-medium text-emerald-400">
                      {row.postRebalanceWeight}%
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