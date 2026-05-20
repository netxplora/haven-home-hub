import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, ShieldCheck, CheckCircle2, Download, ExternalLink, CalendarClock, ChartLine } from "lucide-react";
import { formatMoney } from "@/lib/invest";

interface ReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  receipt: any;
}

export function ReceiptDialog({ open, onClose, receipt }: ReceiptDialogProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const meta = receipt.metadata || {};
  const isInvestment = receipt.type === 'investment' || receipt.type === 'installment';
  const isVerified = receipt.status === 'success' || receipt.status === 'confirmed';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl bg-[#fafafa] text-black p-0 overflow-hidden print:!transform-none print:!fixed print:!inset-0 print:!w-full print:!max-w-none print:!h-auto print:!max-h-none print:!overflow-visible print:!shadow-none print:!border-none print:!bg-white sm:rounded-xl border border-gray-200 shadow-2xl">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            /* Hide the root app to prevent it from taking up space */
            #root {
              display: none !important;
            }
            /* Hide radix overlays */
            [data-radix-focus-guard], [data-aria-hidden="true"] {
              display: none !important;
            }
            .bg-black\\/80 {
              display: none !important;
            }
            #receipt-content, #receipt-content * {
              visibility: visible;
            }
            #receipt-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0 !important;
              margin: 0 !important;
              background: white !important;
            }
            @page {
              size: auto;
              margin: 15mm;
            }
          }
        `}</style>
        
        <div className="max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible custom-scrollbar">
          <div className="p-10 bg-white m-4 sm:m-8 rounded-xl shadow-sm border border-gray-100 print:m-0 print:border-none print:shadow-none" id="receipt-content">
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-200 pb-8 mb-8">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 bg-emerald-900 text-white rounded-lg flex items-center justify-center font-bold font-serif text-2xl shadow-sm shrink-0">
                  VE
                </div>
                <div>
                  <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight leading-none mb-2">Verdant Estate</h1>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Official Transaction Receipt</p>
                  <p className="text-xs text-gray-400 mt-1">123 Premium Blvd, Financial District</p>
                </div>
              </div>
              <div className="sm:text-right w-full sm:w-auto bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Receipt Number</p>
                <p className="text-sm font-mono font-bold text-gray-900 mb-3">{receipt.receipt_id}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date Issued</p>
                <p className="text-sm font-medium text-gray-800">{new Date(receipt.created_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Two Column Layout for Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Investor Information */}
              <div>
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b-2 border-emerald-100 pb-2 mb-4 inline-block">Investor Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase text-gray-400 font-bold">Account Name</p>
                    <p className="font-semibold text-gray-900">{receipt.user_name || "Valued Investor"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-400 font-bold">Contact Email</p>
                    <p className="text-sm text-gray-700">{receipt.user_email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-400 font-bold">Account ID</p>
                    <p className="text-xs font-mono text-gray-500">{receipt.user_id}</p>
                  </div>
                </div>
              </div>

              {/* Payment Verification */}
              <div>
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b-2 border-emerald-100 pb-2 mb-4 inline-block">Payment Verification</h3>
                <div className="space-y-3 p-4 bg-emerald-50/50 rounded-lg border border-emerald-100/50">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] uppercase text-gray-500 font-bold">Status</p>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {isVerified && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {receipt.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-t border-emerald-100/50 pt-2">
                    <p className="text-[10px] uppercase text-gray-500 font-bold">Method</p>
                    <p className="text-sm font-semibold text-gray-800 capitalize">{receipt.payment_method?.replace("_", " ")}</p>
                  </div>
                  <div className="flex justify-between items-center border-t border-emerald-100/50 pt-2">
                    <p className="text-[10px] uppercase text-gray-500 font-bold">Reference</p>
                    <p className="text-xs font-mono font-medium text-gray-800 truncate max-w-[150px]">{receipt.transaction_reference}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Information (If applicable) */}
            {(meta.property_title || isInvestment) && (
              <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider bg-gray-50 p-3.5 border-b border-gray-200">Property Summary</h3>
                <div className="p-5 flex flex-col sm:flex-row gap-5 items-start bg-white">
                  {meta.property_image ? (
                    <img src={meta.property_image} alt="Property" className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-md border border-gray-200 shrink-0 shadow-sm" />
                  ) : (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 rounded-md border border-gray-200 shrink-0 flex flex-col items-center justify-center text-gray-400">
                       <ChartLine className="h-6 w-6 mb-2" />
                       <span className="text-[10px] font-bold uppercase">No Image</span>
                    </div>
                  )}
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {meta.purchase_type || (receipt.type === 'investment' ? 'Fractional Investment' : receipt.type === 'reservation' ? 'Reservation' : 'Asset Purchase')}
                      </span>
                      {meta.property_type && (
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {meta.property_type}
                        </span>
                      )}
                      {meta.property_id && (
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">
                          ID: {meta.property_id.split('-')[0]}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xl font-serif font-bold text-gray-900 mb-1.5 leading-tight">{meta.property_title || "Premium Real Estate Asset"}</p>
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1.5 mb-4">
                      <ExternalLink className="h-3.5 w-3.5" />
                      {meta.property_location || "Location specifics documented in master file."}
                    </p>

                    {/* Property Specifications */}
                    {(meta.bedrooms || meta.bathrooms || meta.size_sqm || meta.features || meta.interior_features || meta.exterior_features) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-4 border-t border-gray-100">
                        {meta.bedrooms && (
                          <div>
                            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">Bedrooms</p>
                            <p className="font-semibold text-gray-900">{meta.bedrooms}</p>
                          </div>
                        )}
                        {meta.bathrooms && (
                          <div>
                            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">Bathrooms</p>
                            <p className="font-semibold text-gray-900">{meta.bathrooms}</p>
                          </div>
                        )}
                        {meta.size_sqm && (
                          <div>
                            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">Size (SQM)</p>
                            <p className="font-semibold text-gray-900">{meta.size_sqm}</p>
                          </div>
                        )}
                        {meta.furnishing_status && (
                          <div>
                            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">Furnishing</p>
                            <p className="font-semibold text-gray-900 capitalize">{meta.furnishing_status}</p>
                          </div>
                        )}
                        {(meta.features || meta.interior_features || meta.exterior_features) && (
                          <div className="col-span-2 sm:col-span-4 mt-1">
                            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1">Amenities & Features</p>
                            <p className="font-medium text-gray-700 text-xs">
                              {(() => {
                                const allFeatures = [
                                  ...(Array.isArray(meta.features) ? meta.features : meta.features ? [meta.features] : []),
                                  ...(Array.isArray(meta.interior_features) ? meta.interior_features : meta.interior_features ? [meta.interior_features] : []),
                                  ...(Array.isArray(meta.exterior_features) ? meta.exterior_features : meta.exterior_features ? [meta.exterior_features] : []),
                                ].filter(Boolean);
                                return allFeatures.join(" • ");
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Investment Breakdown Section */}
            <div className="mb-8">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Financial Breakdown</h3>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Unit details if available */}
                    {meta.units && meta.unit_price && (
                      <tr>
                        <td className="px-5 py-4 border-b border-gray-100">
                          <p className="font-semibold text-gray-800">Asset Units Allocation</p>
                          <p className="text-xs text-gray-500 mt-0.5">{meta.units} Units @ {formatMoney(meta.unit_price, receipt.currency)}</p>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-gray-800 border-b border-gray-100">
                          {formatMoney(meta.units * meta.unit_price, receipt.currency)}
                        </td>
                      </tr>
                    )}

                    {/* Full Payment Info if applicable */}
                    {meta.total_price && (
                      <tr>
                        <td className="px-5 py-3 border-b border-gray-100">
                          <p className="font-semibold text-gray-800">Full Property Value</p>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-gray-800 border-b border-gray-100">
                          {formatMoney(meta.total_price, receipt.currency)}
                        </td>
                      </tr>
                    )}
                    
                    {/* The actual payment recorded */}
                    <tr className="bg-emerald-50/20">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-800">
                          {receipt.type === 'installment' ? 'Installment Payment' : 
                           receipt.type === 'investment' ? 'Initial Investment Deposit' : 
                           receipt.type === 'reservation' ? 'Reservation Fee' :
                           'Payment Processed'}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-gray-800">
                        {formatMoney(receipt.amount_paid, receipt.currency)}
                      </td>
                    </tr>

                    {/* Remaining Balance if applicable */}
                    {meta.remaining_balance !== undefined && (
                      <tr>
                        <td className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                          <p className="font-semibold text-gray-500 uppercase text-xs tracking-wider">Remaining Balance</p>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-red-600 border-t border-gray-100 bg-gray-50/50">
                          {formatMoney(meta.remaining_balance, receipt.currency)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <th className="px-5 py-4 text-right text-gray-500 font-bold uppercase text-xs">Total Settled</th>
                      <td className="px-5 py-4 text-right">
                        <span className="text-2xl font-serif font-bold text-emerald-900">{formatMoney(receipt.amount_paid, receipt.currency)}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ROI & Additional Info Section */}
            {(meta.roi_estimated || meta.certificate_id) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {meta.roi_estimated && (
                  <div className="p-4 border border-gray-200 rounded-lg bg-gray-50/50 flex items-start gap-3">
                    <ChartLine className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Projected Return</p>
                      <p className="text-sm font-semibold text-gray-900">{meta.roi_estimated}</p>
                      {meta.holding_period && <p className="text-xs text-gray-500 mt-0.5">Duration: {meta.holding_period}</p>}
                    </div>
                  </div>
                )}
                
                {meta.certificate_id && (
                  <div className="p-4 border border-emerald-200 rounded-lg bg-emerald-50 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1">Digital Certificate</p>
                      <p className="text-sm font-mono font-bold text-emerald-900">{meta.certificate_id}</p>
                      <p className="text-xs text-emerald-700 mt-0.5">Ownership registered</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer / Certification */}
            <div className="border-t border-gray-200 pt-6 mt-12 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-400">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-medium">Cryptographically verifiable on Verdant Ledger</span>
              </div>
              <p className="text-xs font-medium text-gray-500">
                Issued by Verdant Estate Financial Operations
              </p>
            </div>
            
          </div>
        </div>

        {/* Actions (Hidden on print) */}
        <div className="bg-gray-100 p-4 sm:px-8 sm:py-5 flex items-center justify-end gap-3 print:hidden border-t border-gray-200 rounded-b-xl">
          <Button variant="outline" onClick={onClose} className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-200 font-bold">
            Close
          </Button>
          <Button onClick={handlePrint} className="rounded-xl bg-emerald-800 text-white shadow-sm hover:bg-emerald-900 transition-colors font-bold">
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
