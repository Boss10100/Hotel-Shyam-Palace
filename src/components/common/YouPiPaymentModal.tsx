import React, { useState, useEffect } from 'react';
import { HotelSettings } from '../../types/hotel';
import {
  createYouPiOrder,
  checkYouPiStatus,
  verifyYouPiPaymentWithUtr,
  YouPiOrderResponse,
} from '../../services/youpi';
import { sendAutomatedWhatsApp } from '../../services/whatsapp';
import {
  QrCode,
  CheckCircle,
  Copy,
  ExternalLink,
  MessageCircle,
  Loader2,
  AlertCircle,
  X,
  CreditCard,
  RefreshCw,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  amount: number;
  note: string;
  customerName: string;
  customerPhone: string;
  bookingId?: string;
  roomNumber?: string;
  settings: HotelSettings;
  onSuccess: (paymentDetails: {
    transactionRef: string;
    amount: number;
    paymentMethod: 'youpi_pg';
    utrNumber?: string;
  }) => void;
  onClose: () => void;
}

export const YouPiPaymentModal: React.FC<Props> = ({
  amount,
  note,
  customerName,
  customerPhone,
  bookingId,
  roomNumber,
  settings,
  onSuccess,
  onClose,
}) => {
  const [order, setOrder] = useState<YouPiOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waSuccess, setWaSuccess] = useState(false);

  // Manual UTR entry
  const [utrInput, setUtrInput] = useState('');
  const [verifyingUtr, setVerifyingUtr] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Initialize YouPI order on mount
  useEffect(() => {
    let isMounted = true;
    const initOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await createYouPiOrder(
          {
            amount,
            note: note || `Stay at Hotel Shyam Palace (${bookingId || 'FrontDesk'})`,
            customerName,
            customerPhone,
            bookingId,
            roomNumber,
          },
          settings
        );
        if (isMounted) {
          setOrder(res);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to initialize YouPI UPI Order');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initOrder();
    return () => {
      isMounted = false;
    };
  }, [amount, note, customerName, customerPhone, bookingId, roomNumber, settings]);

  // Polling for automated status if enabled
  useEffect(() => {
    if (!order || isCompleted || !settings.youpiAutoVerify) return;

    const interval = setInterval(async () => {
      try {
        const res = await checkYouPiStatus(order.orderId, order.txnRef);
        if (res.status === 'completed') {
          setIsCompleted(true);
          clearInterval(interval);
          onSuccess({
            transactionRef: order.txnRef,
            amount,
            paymentMethod: 'youpi_pg',
            utrNumber: res.utr,
          });
        }
      } catch (e) {
        // Silent poll error
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [order, isCompleted, settings.youpiAutoVerify, amount, onSuccess]);

  const handleManualCheck = async () => {
    if (!order) return;
    setChecking(true);
    try {
      const res = await checkYouPiStatus(order.orderId, order.txnRef);
      if (res.status === 'completed') {
        setIsCompleted(true);
        onSuccess({
          transactionRef: order.txnRef,
          amount,
          paymentMethod: 'youpi_pg',
          utrNumber: res.utr,
        });
      } else {
        setError('Payment not detected on bank node yet. If customer paid, enter 12-digit UTR below.');
      }
    } catch (err: any) {
      setError(err.message || 'Gateway check error');
    } finally {
      setChecking(false);
    }
  };

  const handleVerifyUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setVerifyingUtr(true);
    try {
      await verifyYouPiPaymentWithUtr(order.orderId, order.txnRef, utrInput.trim(), amount);
      setIsCompleted(true);
      onSuccess({
        transactionRef: order.txnRef,
        amount,
        paymentMethod: 'youpi_pg',
        utrNumber: utrInput.trim() || `UTR-${Date.now().toString().slice(-6)}`,
      });
    } catch (err: any) {
      setError('Failed to record UTR verification');
    } finally {
      setVerifyingUtr(false);
    }
  };

  const handleCopyLink = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.upiString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareOnWhatsApp = async () => {
    if (!order || !customerPhone) return;
    setWaSending(true);
    try {
      await sendAutomatedWhatsApp({
        recipientPhone: customerPhone,
        templateType: 'custom',
        customMessage:
          `💳 *HOTEL SHYAM PALACE - YOUPI PAYMENT LINK*\n` +
          `Pandokhar Sarkar Dham (Near Kali Maiya Mandir)\n` +
          `-----------------------------------------\n` +
          `Guest: *${customerName || 'Pilgrim Guest'}*\n` +
          `Payable Amount: *₹${amount.toFixed(2)}*\n` +
          `Purpose: ${note}\n` +
          `Payee VPA: \`${order.vpa}\`\n\n` +
          `Click to pay via UPI (PhonePe / GPay / Paytm):\n` +
          `${order.upiString}\n\n` +
          `Hotel Helpline: ${settings.phone || settings.whatsappConnectedNumber}`,
      });
      setWaSuccess(true);
      setTimeout(() => setWaSuccess(false), 3000);
    } catch (err) {
      console.warn('WhatsApp share error:', err);
    } finally {
      setWaSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-slate-900 border border-amber-900/50 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-6 animate-fade-in max-h-[92vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-900/40">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-amber-100 font-serif-luxury">
                  YouPI Gateway (Staff Portal)
                </h3>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  NPCI UPI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Self-Hosted UPI Payment Gateway (YouPI-PG)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-sm text-slate-300">Generating Dynamic YouPI QR Code...</p>
          </div>
        ) : order ? (
          <div className="space-y-4">
            {/* Amount & Receiver Pill */}
            <div className="bg-gradient-to-r from-amber-950/40 to-slate-950 border border-amber-900/40 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-amber-400/80 font-medium">
                  Amount Payable (₹)
                </p>
                <p className="text-2xl font-black text-white font-mono">
                  ₹{amount.toLocaleString('en-IN')}.00
                </p>
                <p className="text-xs text-slate-400 truncate max-w-[220px]">
                  {customerName ? `${customerName} • ` : ''}{note}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-mono text-amber-300">
                  {order.vpa}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">
                  Payee: {order.payeeName}
                </p>
              </div>
            </div>

            {/* Dynamic QR Code Card */}
            <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center shadow-lg border border-slate-200">
              <div className="relative">
                <img
                  src={order.qrCodeUrl}
                  alt="YouPI QR Code"
                  className="w-48 h-48 object-contain rounded-lg"
                />
                {isCompleted && (
                  <div className="absolute inset-0 bg-emerald-950/90 rounded-lg flex flex-col items-center justify-center text-white backdrop-blur-sm animate-fade-in">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mb-2" />
                    <p className="font-bold text-sm">Payment Verified!</p>
                    <p className="text-xs text-emerald-200 font-mono">UTR Received</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3 text-slate-800 text-[11px] font-semibold">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Scan via GPay / PhonePe / Paytm / BHIM
                </span>
              </div>
            </div>

            {/* Direct Intent / Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'UPI Link Copied!' : 'Copy UPI Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareOnWhatsApp}
                disabled={waSending || !customerPhone}
                className="py-2 px-3 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-emerald-700/60 transition-colors cursor-pointer disabled:opacity-50"
              >
                {waSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{waSuccess ? 'Sent to Guest!' : 'Send to WhatsApp'}</span>
              </button>
            </div>

            {/* Verification Section */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Status & Bank Verification
                </span>
                <button
                  type="button"
                  onClick={handleManualCheck}
                  disabled={checking || isCompleted}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                  <span>{checking ? 'Checking...' : 'Check Status'}</span>
                </button>
              </div>

              {/* Quick UTR Confirmation Form */}
              <form onSubmit={handleVerifyUtr} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 12-digit Bank UTR / RRN or click Verify"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={verifyingUtr || isCompleted}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {verifyingUtr ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Paid</span>
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
