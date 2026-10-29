import React, { useState } from 'react';
import { Invoice, HotelSettings } from '../../types/hotel';
import { Printer, X, MessageCircle, CheckCircle, Download, Building2, ShieldCheck, QrCode } from 'lucide-react';
import { sendAutomatedWhatsApp } from '../../services/whatsapp';

interface Props {
  invoice: Invoice;
  settings: HotelSettings;
  onClose: () => void;
}

// Number to Words converter for Indian Rupees
function numberToWordsINR(amount: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(num: number): string {
    if (num === 0) return 'Zero';
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + a[num % 10] : '');
    if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + inWords(num % 100) : '');
    if (num < 100000) return inWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + inWords(num % 1000) : '');
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + inWords(num % 100000) : '');
    return inWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + inWords(num % 10000000) : '');
  }

  const rounded = Math.round(amount);
  return `Rupees ${inWords(rounded)} Only`;
}

export const PrintableInvoice: React.FC<Props> = ({ invoice, settings, onClose }) => {
  const [sendingWa, setSendingWa] = useState(false);
  const [waSentStatus, setWaSentStatus] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = async () => {
    setSendingWa(true);
    setWaSentStatus(null);
    try {
      const res = await sendAutomatedWhatsApp({
        recipientPhone: invoice.guestPhone,
        templateType: 'checkout_invoice',
        bookingData: {
          ...invoice,
          hotelName: settings.hotelName,
          brandName: settings.brandName,
          gstNumber: settings.gstNumber,
        },
      });

      if (res.success) {
        setWaSentStatus('Bill sent automatically to customer WhatsApp via hotel linked device (+91 7000354771)!');
      } else if (res.waUrl) {
        window.open(res.waUrl, '_blank');
        setWaSentStatus('Opened direct WhatsApp dispatch for customer.');
      }
    } catch (err: any) {
      setWaSentStatus(`WhatsApp dispatch: ${err.message || 'Opening client link'}`);
    } finally {
      setSendingWa(false);
      setTimeout(() => setWaSentStatus(null), 5000);
    }
  };

  const totalNights = Math.max(1, invoice.totalNights || 1);
  const roomTariffBase = invoice.roomRate * totalNights;
  const taxableValue = invoice.subtotal || roomTariffBase;
  const cgst = invoice.cgstAmount || Math.round(taxableValue * 0.06);
  const sgst = invoice.sgstAmount || Math.round(taxableValue * 0.06);
  const grandTotal = invoice.totalAmount || (taxableValue + cgst + sgst);
  const wordsTotal = numberToWordsINR(grandTotal);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative my-auto">
        {/* Action Controls (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-200 pb-4 no-print">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-800">GST Tax Invoice & Departure Bill</span>
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-300">
                Official Bill Format
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reflects all hotel master settings (GST, Bank Account, IFSC, Logo). Ready to print or share.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSendWhatsApp}
              disabled={sendingWa}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Send bill to guest's WhatsApp number"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{sendingWa ? 'Sending...' : 'Send to Guest WhatsApp'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {waSentStatus && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2 no-print">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{waSentStatus}</span>
          </div>
        )}

        {/* Printable Paper Area (A4 Form Factor) */}
        <div className="printable-area border-2 border-slate-300 p-6 sm:p-8 rounded-xl bg-white text-slate-900 shadow-sm text-xs">
          {/* Top Brand Header */}
          <div className="border-b-2 border-amber-800 pb-5 mb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-start gap-4">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.hotelName}
                  className="w-16 h-16 rounded-xl object-cover border border-amber-700/30 p-1 bg-amber-50 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-amber-800 text-amber-200 flex items-center justify-center shrink-0">
                  <Building2 className="w-8 h-8" />
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-serif-luxury text-amber-900 tracking-wide">
                  {settings.brandName || 'Shree H.V.M Hotel and Restaurant'}
                </h1>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {settings.hotelName} {settings.tagline ? `• ${settings.tagline}` : ''}
                </p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-lg leading-relaxed">
                  {settings.address}
                </p>
                <div className="flex flex-wrap gap-x-4 text-[11px] text-slate-700 mt-1 font-medium">
                  <span><strong>Phone / WhatsApp:</strong> +91 {settings.phone}</span>
                  <span><strong>Email:</strong> {settings.email}</span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 w-full sm:w-auto">
              <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 border border-amber-300 rounded-md">
                ORIGINAL FOR RECIPIENT
              </span>
              <p className="text-sm font-extrabold text-slate-900 mt-2 font-mono">
                {invoice.invoiceNumber}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                <strong>Date:</strong> {new Date(invoice.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <div className="mt-1.5 space-y-0.5 font-mono text-[10px] text-slate-700 bg-slate-100 p-2 rounded border border-slate-200">
                <p><strong>GSTIN:</strong> {settings.gstNumber || '23AAACH7000B1Z8'}</p>
                {settings.fssaiNumber && <p><strong>FSSAI:</strong> {settings.fssaiNumber}</p>}
                <p><strong>State:</strong> {settings.stateName || 'Madhya Pradesh'} (Code: {settings.stateCode || '23'})</p>
              </div>
            </div>
          </div>

          {/* Billed To & Stay Particulars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl mb-5 border border-slate-200 text-xs">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Billed To (Primary Guest):</p>
              <p className="text-sm font-bold text-slate-900">{invoice.guestName}</p>
              <p className="text-slate-700"><strong>Mobile:</strong> +91 {invoice.guestPhone}</p>
              {invoice.guestAddress && (
                <p className="text-slate-600"><strong>Address:</strong> {invoice.guestAddress}</p>
              )}
              {invoice.guestGstin ? (
                <p className="text-slate-800 font-mono"><strong>Guest GSTIN:</strong> {invoice.guestGstin}</p>
              ) : (
                <p className="text-slate-500 text-[10px]">Type: Unregistered Consumer (B2C)</p>
              )}
            </div>

            <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
              <p className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Stay & Room Details:</p>
              <div className="flex justify-between">
                <span className="text-slate-600">Booking Ref:</span>
                <span className="font-mono font-bold text-slate-900">{invoice.bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Assigned Room:</span>
                <span className="font-bold text-amber-900">Room {invoice.roomNumber} ({invoice.roomCategory})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Check-in:</span>
                <span className="font-medium text-slate-800">{invoice.checkInDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Check-out:</span>
                <span className="font-medium text-slate-800">{invoice.checkOutDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Stay Duration:</span>
                <span className="font-bold text-slate-900">{invoice.totalNights} Night(s)</span>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-200/80 text-slate-800 border-y-2 border-slate-300">
                  <th className="py-2.5 px-3 text-left font-bold w-12">S.No</th>
                  <th className="py-2.5 px-3 text-left font-bold">Item Description</th>
                  <th className="py-2.5 px-3 text-center font-bold">HSN/SAC</th>
                  <th className="py-2.5 px-3 text-center font-bold">Qty/Nights</th>
                  <th className="py-2.5 px-3 text-right font-bold">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right font-bold">Taxable Value (₹)</th>
                  <th className="py-2.5 px-3 text-right font-bold">CGST (6%)</th>
                  <th className="py-2.5 px-3 text-right font-bold">SGST (6%)</th>
                  <th className="py-2.5 px-3 text-right font-bold">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-white">
                  <td className="py-3 px-3 text-slate-500 font-mono">1</td>
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900">Room Accommodation Tariff</p>
                    <p className="text-[11px] text-slate-500">
                      {invoice.roomCategory} - Room {invoice.roomNumber} ({invoice.totalNights} Night Stay)
                    </p>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">996311</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800">{invoice.totalNights}</td>
                  <td className="py-3 px-3 text-right text-slate-800">₹{invoice.roomRate.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900">₹{taxableValue.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-3 text-right text-slate-700">₹{cgst.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-3 text-right text-slate-700">₹{sgst.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">₹{grandTotal.toLocaleString('en-IN')}</td>
                </tr>
                {invoice.fnbCharges && invoice.fnbCharges > 0 && (
                  <tr className="bg-white">
                    <td className="py-2.5 px-3 text-slate-500 font-mono">2</td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900">Shree H.V.M Satvik Dining / F&B</p>
                      <p className="text-[11px] text-slate-500">Pure vegetarian satvik bhojan / pilgrim dining</p>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">996331</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">1</td>
                    <td className="py-2.5 px-3 text-right text-slate-800">₹{invoice.fnbCharges.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">₹{invoice.fnbCharges.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">₹{Math.round(invoice.fnbCharges * 0.025).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">₹{Math.round(invoice.fnbCharges * 0.025).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{Math.round(invoice.fnbCharges * 1.05).toLocaleString('en-IN')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Amount in Words & Tax Breakdown Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                <p className="text-[10px] uppercase font-bold text-amber-900">Invoice Amount in Words:</p>
                <p className="text-xs font-bold text-slate-900 mt-1 italic">{wordsTotal}</p>
              </div>

              {/* Official Bank Details & UPI QR Preview */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Official Hotel Bank & Digital Payment Details:</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                  <div>
                    <p><strong>Bank:</strong> {settings.bankName || 'State Bank of India'}</p>
                    <p><strong>A/C No:</strong> <span className="font-mono font-bold">{settings.bankAccountNo || '392019482910'}</span></p>
                    <p><strong>IFSC:</strong> <span className="font-mono">{settings.bankIfsc || 'SBIN0001234'}</span></p>
                  </div>
                  <div>
                    <p><strong>A/C Name:</strong> {settings.accountHolderName || settings.brandName}</p>
                    <p><strong>Branch:</strong> {settings.bankBranch || 'Bhander Branch, Datia'}</p>
                    <p><strong>UPI ID:</strong> <span className="font-mono font-semibold text-amber-900">{settings.upiId || '7000354771@upi'}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations & Payment Ledger */}
            <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200 md:pl-6 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount (Total):</span>
                <span className="font-medium text-slate-900 font-mono">₹{taxableValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Central GST (CGST @ 6.0%):</span>
                <span className="font-mono text-slate-800">₹{cgst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>State GST (SGST @ 6.0%):</span>
                <span className="font-mono text-slate-800">₹{sgst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium pb-1 border-b border-slate-200">
                <span>Total Tax Amount (12%):</span>
                <span className="font-mono text-slate-900">₹{(cgst + sgst).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-slate-900 font-extrabold text-sm py-1">
                <span>Grand Total (Incl. Taxes):</span>
                <span className="text-amber-900 font-mono text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-slate-600 pt-1">
                <span>Advance Paid (UPI/Counter):</span>
                <span className="font-mono text-emerald-700 font-medium">- ₹{(invoice.advancePaid || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Settlement Payment at Departure:</span>
                <span className="font-mono text-emerald-700 font-medium">
                  - ₹{(invoice.balancePaid || (grandTotal - (invoice.advancePaid || 0))).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center text-emerald-900 font-bold bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-300 mt-2">
                <span>Balance Due:</span>
                <span className="font-mono text-sm">₹0.00 (PAID IN FULL)</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions & Signatures */}
          <div className="border-t-2 border-slate-200 pt-4 text-[10px] text-slate-600 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="md:col-span-2 space-y-1">
              <p className="font-bold text-slate-800 uppercase tracking-wide">Terms & Conditions:</p>
              <ul className="list-decimal pl-4 space-y-0.5 leading-relaxed">
                {(settings.invoiceTerms && settings.invoiceTerms.length > 0
                  ? settings.invoiceTerms
                  : [
                      'Check-out time is strictly 12:00 PM.',
                      'Pure Satvik environment at Pandokhar Sarkar Dham. Consumption of alcohol or non-veg food is strictly prohibited.',
                      'Room tariff is subject to GST under SAC Code 996311.',
                      'Disputes, if any, are subject to Bhander / Datia (M.P.) jurisdiction only.',
                    ]
                ).map((term, idx) => (
                  <li key={idx}>{term}</li>
                ))}
              </ul>
              {settings.invoiceNote && (
                <p className="pt-2 font-semibold text-amber-900 italic">
                  &quot;{settings.invoiceNote}&quot;
                </p>
              )}
            </div>

            <div className="space-y-4 text-center">
              <div className="border-b border-dashed border-slate-400 h-10 w-44 mx-auto"></div>
              <div>
                <p className="font-bold text-slate-900 text-[11px]">{settings.brandName}</p>
                <p className="text-[10px] text-slate-500">Authorized Signatory / Manager</p>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5">Staff: {invoice.issuedByStaffName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
