import React, { useState } from 'react';
import { Invoice, Payment, HotelSettings } from '../../types/hotel';
import { Receipt, Search, Printer, IndianRupee, FileText, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface Props {
  invoices: Invoice[];
  payments: Payment[];
  settings: HotelSettings;
  onPrintInvoice: (invoice: Invoice) => void;
}

export const BillingInvoicesManager: React.FC<Props> = ({
  invoices,
  payments,
  settings,
  onPrintInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.guestName.toLowerCase().includes(q) ||
      inv.guestPhone.includes(q) ||
      (inv.guestAddress || '').toLowerCase().includes(q) ||
      inv.bookingId.toLowerCase().includes(q) ||
      inv.roomNumber.includes(q)
    );
  });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalTaxCollected = invoices.reduce((sum, inv) => sum + (inv.totalTax || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold font-serif-luxury text-white">
            Billing & Official GST Tax Invoices
          </h2>
          <p className="text-xs text-slate-400">
            Sequential invoice registry, CGST (6%) + SGST (6%) audit ledger, and printable receipts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Invoiced</span>
            <span className="text-lg font-bold font-serif-luxury text-amber-300">
              ₹{totalInvoiced.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">GST Tax Collected</span>
            <span className="text-lg font-bold font-serif-luxury text-emerald-400">
              ₹{totalTaxCollected.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Invoice #, Guest Name, Mobile, Address, or Room..."
          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date Issued</th>
                <th className="py-3 px-4">Billed To (Guest)</th>
                <th className="py-3 px-4">Room & Duration</th>
                <th className="py-3 px-4 text-right">Taxable Subtotal</th>
                <th className="py-3 px-4 text-right">GST (12%)</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
                <th className="py-3 px-4 text-center">Print / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono">
                    <span className="font-bold text-amber-400 block">{inv.invoiceNumber}</span>
                    <span className="text-[10px] text-slate-500">Ref: {inv.bookingId}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(inv.issuedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-white block">{inv.guestName}</span>
                    <span className="text-slate-400 font-mono text-[11px] block">{inv.guestPhone}</span>
                    {inv.guestAddress && (
                      <span className="text-[10px] text-slate-500 block max-w-[180px] truncate" title={inv.guestAddress}>
                        {inv.guestAddress}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-200 block">Room {inv.roomNumber} ({inv.roomCategory})</span>
                    <span className="text-[10px] text-slate-400">
                      {inv.totalNights} Night(s) • {inv.checkInDate} to {inv.checkOutDate}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-300">
                    ₹{inv.subtotal.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-400">
                    <div>₹{inv.totalTax.toLocaleString('en-IN')}</div>
                    <span className="text-[9px] text-slate-500">(CGST ₹{inv.cgstAmount} + SGST ₹{inv.sgstAmount})</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span className="font-bold text-emerald-400 text-sm">
                      ₹{inv.totalAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Paid via {inv.paymentMode}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onPrintInvoice(inv)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[11px] rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print GST Invoice</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    No invoices generated yet. Invoices are automatically issued when a guest checks out.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
