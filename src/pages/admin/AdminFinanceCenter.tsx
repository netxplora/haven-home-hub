import { useState } from "react";
import { AdminPayments } from "./AdminPayments";
import { AdminInvestors } from "./AdminInvestors";
import { AdminInstallments } from "./AdminInstallments";
import { AdminPayouts } from "./AdminPayouts";
import { AdminWallets } from "./AdminWallets";
import { AdminWithdrawals } from "./AdminWithdrawals";
import { AdminReceipts } from "./AdminReceipts";
import { AdminReservations } from "./AdminReservations";
import { AdminVerificationQueue } from "./AdminVerificationQueue";
import { AdminMarketplace } from "./AdminMarketplace";

export function AdminFinanceCenter() {
  const [activeTab, setActiveTab] = useState("verification");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-serif font-bold">Finance Center</h2>
        <p className="text-muted-foreground mt-1">Centralized hub for all financial operations, payments, and verifications.</p>
      </div>

      <div className="border-b border-border/50 overflow-x-auto no-scrollbar">
        <div className="flex space-x-6 min-w-max">
          {[
            { id: "verification", label: "Verification Queue" },
            { id: "investments", label: "Investments" },
            { id: "installments", label: "Installments" },
            { id: "reservations", label: "Reservations" },
            { id: "payments", label: "Payments" },
            { id: "withdrawals", label: "Withdrawals" },
            { id: "marketplace", label: "Marketplace" },
            { id: "payouts", label: "Payouts" },
            { id: "wallets", label: "Wallets" },
            { id: "receipts", label: "Receipts" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        {activeTab === "verification" && <AdminVerificationQueue />}
        {activeTab === "investments" && <AdminInvestors />}
        {activeTab === "installments" && <AdminInstallments />}
        {activeTab === "reservations" && <AdminReservations />}
        {activeTab === "payments" && <AdminPayments />}
        {activeTab === "withdrawals" && <AdminWithdrawals />}
        {activeTab === "marketplace" && <AdminMarketplace />}
        {activeTab === "payouts" && <AdminPayouts />}
        {activeTab === "wallets" && <AdminWallets />}
        {activeTab === "receipts" && <AdminReceipts />}
      </div>
    </div>
  );
}
