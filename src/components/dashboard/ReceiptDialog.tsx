import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-white text-black p-0 overflow-hidden print:w-full print:max-w-none print:shadow-none print:m-0 print:border-none print:bg-white sm:rounded-xl border-none shadow-2xl">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #receipt-content, #receipt-content * {
              visibility: visible;
            }
            #receipt-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 40px !important;
            }
            @page {
              size: auto;
              margin: 0mm;
            }
          }
        `}</style>
        <div className="p-10" id="receipt-content">
          {/* Header */}
          <div className="flex justify-between items-start mb-10 border-b pb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold font-serif text-xl">A</div>
                <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">Verdant Estate</h1>
              </div>
              <p className="text-sm text-gray-500 mt-1">Verdant Estate Real Estate Trust</p>
              <p className="text-sm text-gray-500">contact@amiragold.com</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-800 uppercase tracking-widest mb-2">Receipt</h2>
              <p className="text-sm font-mono text-gray-500 font-medium">{receipt.receipt_id}</p>
              <p className="text-sm text-gray-500">{new Date(receipt.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
              <p className="font-bold text-gray-800 text-lg">{receipt.user_name || "Customer"}</p>
              <p className="text-sm text-gray-600">{receipt.user_email || "N/A"}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Info</h3>
              <p className="text-sm text-gray-600 capitalize mb-1">Method: <span className="font-semibold text-gray-800">{receipt.payment_method?.replace("_", " ")}</span></p>
              <p className="text-sm text-gray-600 mb-1">Ref: <span className="font-mono text-gray-800">{receipt.transaction_reference}</span></p>
              <p className="text-sm text-gray-600 capitalize">Status: <span className="font-bold text-green-600">{receipt.status}</span></p>
            </div>
          </div>

          {/* Itemized Info */}
          <div className="mb-10">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Description</h3>
            <div className="flex justify-between items-center bg-gray-50/80 p-6 rounded-xl border border-gray-100 print:bg-transparent print:border-none print:p-0">
              <div>
                <p className="font-bold text-gray-800 text-lg">
                  {receipt.type === 'investment' ? 'Investment Deposit' : 
                   receipt.type === 'reservation' ? 'Property Reservation' : 
                   receipt.type === 'booking' ? 'Booking Fee' : 
                   receipt.type ? receipt.type : 'Payment'}
                </p>
                <p className="text-sm text-gray-500 mt-1 capitalize">Transaction ID: {receipt.payment_id}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(receipt.amount_paid, receipt.currency)}</p>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end border-t pt-8">
            <div className="text-right">
              <p className="text-sm text-gray-400 uppercase tracking-wider font-bold mb-2">Total Paid</p>
              <p className="text-5xl font-serif font-bold text-gray-900 tracking-tighter">{formatMoney(receipt.amount_paid, receipt.currency)}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center text-sm text-gray-400 border-t pt-8">
            <p className="font-medium text-gray-500 mb-1">Thank you for choosing Verdant Estate.</p>
            <p>This receipt is auto-generated and serves as official proof of payment.</p>
          </div>
        </div>

        {/* Actions (Hidden on print) */}
        <div className="bg-gray-50 p-6 flex justify-end gap-3 print:hidden border-t">
          <Button variant="outline" onClick={onClose} className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900">Close</Button>
          <Button onClick={handlePrint} className="rounded-xl bg-primary text-primary-foreground shadow-sm hover:shadow-card hover:-translate-y-0.5 transition-all">
            <Printer className="mr-2 h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
