import React, { useState } from "react";
import { Calculator } from "lucide-react";
import { INR } from "@/utils/format";

/**
 * EMICalculator — estimates home-loan EMI for a given property price.
 * Uses the standard reducing-balance (PMT) formula.
 */
const EMICalculator = ({ priceINR = 0 }) => {
  const [loanPct, setLoanPct] = useState(80);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  const loanAmt = Math.round((priceINR * loanPct) / 100);
  const downPayment = priceINR - loanAmt;
  const monthlyRate = rate / 12 / 100;
  const months = tenure * 12;

  let emi = 0;
  if (monthlyRate > 0 && months > 0 && loanAmt > 0) {
    const factor = Math.pow(1 + monthlyRate, months);
    emi = Math.round((loanAmt * monthlyRate * factor) / (factor - 1));
  }

  const totalPayment = emi * months;
  const totalInterest = totalPayment - loanAmt;
  const interestPct = totalPayment > 0 ? Math.round((totalInterest / totalPayment) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Calculator size={18} className="text-vs-gold" />
        <h3 className="font-display font-medium text-vs-text-primary text-lg">
          EMI Calculator
        </h3>
      </div>

      <div className="space-y-6">
        {/* Loan % slider */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs text-vs-text-muted uppercase tracking-wider">
              Loan amount <span className="text-vs-gold">({loanPct}%)</span>
            </span>
            <span className="text-sm font-medium text-vs-gold">{INR(loanAmt)}</span>
          </div>
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={loanPct}
            onChange={(e) => setLoanPct(Number(e.target.value))}
            className="w-full accent-vs-gold slider"
          />
          <div className="flex justify-between text-xs text-vs-text-muted mt-1.5">
            <span>Down: {INR(downPayment)}</span>
            <span>Loan: {INR(loanAmt)}</span>
          </div>
        </div>

        {/* Interest rate slider */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs text-vs-text-muted uppercase tracking-wider">
              Interest rate <span className="text-vs-gold">(yearly)</span>
            </span>
            <span className="text-sm font-medium text-vs-gold">{rate.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={20}
            step={0.1}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-vs-gold slider"
          />
          <div className="flex justify-between text-xs text-vs-text-muted mt-1.5">
            <span>5%</span>
            <span>20%</span>
          </div>
        </div>

        {/* Tenure slider */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs text-vs-text-muted uppercase tracking-wider">
              Loan tenure
            </span>
            <span className="text-sm font-medium text-vs-gold">
              {tenure} {tenure === 1 ? "year" : "years"}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={tenure}
            onChange={(e) => setTenure(Number(e.target.value))}
            className="w-full accent-vs-gold slider"
          />
          <div className="flex justify-between text-xs text-vs-text-muted mt-1.5">
            <span>1 yr</span>
            <span>30 yrs</span>
          </div>
        </div>
      </div>

      {/* Result panel */}
      <div className="mt-6 rounded-lg bg-vs-gold/10 border border-vs-gold/30 p-5">
        <div className="text-center mb-5">
          <div className="text-[10px] uppercase tracking-wider text-vs-gold mb-1">
            Monthly EMI
          </div>
          <div className="font-display text-3xl font-medium text-vs-text-primary">
            {emi > 0 ? INR(emi) : "—"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-sm">
          <div className="bg-vs-bg rounded-lg p-3.5 text-center border border-vs-border">
            <div className="text-[10px] text-vs-text-muted uppercase tracking-wider">Principal</div>
            <div className="font-medium text-vs-text-primary mt-1">{INR(loanAmt)}</div>
          </div>
          <div className="bg-vs-bg rounded-lg p-3.5 text-center border border-vs-border">
            <div className="text-[10px] text-vs-text-muted uppercase tracking-wider">Total interest</div>
            <div className="font-medium text-red-400 mt-1">{INR(totalInterest)}</div>
          </div>
          <div className="bg-vs-bg rounded-lg p-3.5 text-center border border-vs-border col-span-2">
            <div className="text-[10px] text-vs-text-muted uppercase tracking-wider">
              Total payment {interestPct > 0 && <span>({interestPct}% interest)</span>}
            </div>
            <div className="font-medium text-vs-text-primary mt-1">{INR(totalPayment)}</div>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-vs-text-muted text-center leading-relaxed">
          Estimates based on reducing-balance method. Actual rates depend on your lender &amp; profile.
        </p>
      </div>
    </div>
  );
};

export default EMICalculator;
