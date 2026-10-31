"use client";

import React, { useState, useEffect, useMemo } from "react";
import { calculateCashflowRebalance } from "@/lib/rebalancer";
import { loadSavedPortfolio, savePortfolioState } from "@/lib/storage";
import { AssetAllocation, RebalanceMode } from "@/types/portfolio";
import CasUploadModal from "@/components/CasUploadModal";

const DEFAULT_HOLDINGS: AssetAllocation = { equities: 860000, debt: 100000, commodities: 40000 };
const DEFAULT_TARGETS: AssetAllocation = { equities: 80, debt: 15, commodities: 5 };

export default function HomePage() {
  const [holdings, setHoldings] = useState<AssetAllocation>(DEFAULT_HOLDINGS);
  const [targets, setTargets] = useState<AssetAllocation>(DEFAULT_TARGETS);
  const [monthlyInflow, setMonthlyInflow] = useState<number>(50000);
  const [mode, setMode] = useState<RebalanceMode>("inflow_only");
  const [toleranceBand, setToleranceBand] = useState<number>(5.0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

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

  function handleClearData() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("rebalancer_portfolio_state_v1");
    }
    setHoldings({ equities: 0, debt: 0, commodities: 0 });
    setMonthlyInflow(0);
  }

  // Clean numeric string parser that strips leading zeros and non-digits
  function handleHoldingChange(key: keyof AssetAllocation, valStr: string) {
    const cleaned = valStr.replace(/\D/g, "");
    const num = cleaned === "" ? 0 : Number(cleaned);
    setHoldings({ ...holdings, [key]: num });
  }

  function handleInflowChange(valStr: string) {
    const cleaned = valStr.replace(/\D/g, "");
    const num = cleaned === "" ? 0 : Number(cleaned);
    setMonthlyInflow(num);
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
                100% On-Device & Private
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Import your CAMS/KFintech CAS statement or enter your exact portfolio holdings.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-900/30"
            >
              📄 Import CAS PDF Statement
            </button>
            <button
              onClick={handleClearData}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl transition"
            >
              Reset / Clear Data
            </button>
            <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Total Portfolio</span>
              <span className="text-lg font-bold text-emerald-400">
                ₹{totalPortfolio.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </header>

        {/* Strategy Mode & Corridor */}
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
                Inflow Only (Zero Tax)
              </button>
              <button
                onClick={() => setMode("full_rebalance")}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                  mode === "full_rebalance"
                    ? "bg-amber-600 text-white border-amber-500"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                Full Rebalance (Sell & Buy)
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
          </div>
        </section>

        {/* Holdings & Targets */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">1. Asset Holdings (₹)</h2>
            <p className="text-xs text-slate-400">Type your exact holding value in rupees:</p>
            {(["equities", "debt", "commodities"] as const).map((key) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <label className="text-sm text-slate-300 capitalize w-32">{key}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={holdings[key] === 0 ? "" : holdings[key]}
                  placeholder="0"
                  onChange={(e) => handleHoldingChange(key, e.target.value)}
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
            <p className="text-xs text-slate-400">Define your target percentage allocation:</p>

            {(["equities", "debt", "commodities"] as const).map((key) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <label className="text-sm text-slate-300 capitalize w-32">{key} (%)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={targets[key] === 0 ? "" : targets[key]}
                  placeholder="0"
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, "");
                    setTargets({ ...targets, [key]: cleaned === "" ? 0 : Number(cleaned) });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Monthly Inflow Slider + Direct Number Input */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <label className="text-base font-semibold text-white">
              3. Fresh Monthly SIP / Capital Available to Deploy
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Amount (₹):</span>
              <input
                type="text"
                inputMode="numeric"
                value={monthlyInflow === 0 ? "" : monthlyInflow}
                placeholder="0"
                onChange={(e) => handleInflowChange(e.target.value)}
                className="w-36 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-blue-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={500000}
            step={5000}
            value={monthlyInflow}
            onChange={(e) => setMonthlyInflow(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </section>

        {/* Action Table */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-base font-semibold text-white">
              Action Plan (Post-Rebalance Portfolio: ₹{(totalPortfolio + monthlyInflow).toLocaleString("en-IN")})
            </h2>
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

      {/* CAS Upload Modal */}
      <CasUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onParsed={(parsedHoldings) => {
          setHoldings(parsedHoldings);
        }}
      />
    </main>
  );
}