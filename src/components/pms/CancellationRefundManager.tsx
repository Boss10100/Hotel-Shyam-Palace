import React, { useState } from 'react';
import { Refund, Booking, StaffUser, HotelSettings } from '../../types/hotel';
import { logAuditEvent, fastBatchCommit } from '../../services/db';
import { RotateCcw, AlertTriangle, CheckCircle, Clock, Search, Check, Loader2 } from 'lucide-react';

interface Props {
  refunds: Refund[];
  bookings: Booking[];
  staffUser: StaffUser;
  settings: HotelSettings;
}

export const CancellationRefundManager: React.FC<Props> = ({
  refunds,
  bookings,
  staffUser,
  settings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [refundTxnRef, setRefundTxnRef] = useState('');
  const [markingDone, setMarkingDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = refunds.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.bookingId.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q) ||
      r.transactionRef?.toLowerCase().includes(q)
    );
  });

  const handleMarkRefunded = async (refund: Refund) => {
    setErrorMsg(null);
    if (!refundTxnRef.trim()) {
      setErrorMsg('Please enter the UPI transaction reference / UTR number for the refund payment.');
      return;
    }

    setMarkingDone(true);
    try {
      const now = new Date().toISOString();
      await fastBatchCommit([
        {
          type: 'set',
          collection: 'refunds',
          id: refund.id,
          data: {
            refundStatus: 'completed',
            transactionRef: refundTxnRef.trim(),
          },
          merge: true,
        },
        {
          type: 'set',
          collection: 'bookings',
          id: refund.bookingId,
          data: {
            status: 'refunded',
            updatedAt: now,
          },
          merge: true,
        },
      ]);

      logAuditEvent(
        'REFUND_SETTLED',
        'Refund',
        refund.id,
        `Settled refund of ₹${refund.netRefundAmount} for booking ${refund.bookingId}. UTR: ${refundTxnRef}`,
        staffUser
      ).catch(() => {});

      setSelectedRefund(null);
      setRefundTxnRef('');
    } catch (err: any) {
      setErrorMsg('Error updating refund: ' + err.message);
    } finally {
      setMarkingDone(false);
    }
  };

  const totalRefundAmount = refunds
    .filter((r) => r.refundStatus === 'completed')
    .reduce((sum, r) => sum + (r.netRefundAmount || 0), 0);

  const pendingRefundAmount = refunds
    .filter((r) => r.refundStatus === 'pending')
    .reduce((sum, r) => sum + (r.netRefundAmount || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold font-serif-luxury text-white">
            Cancellations & Refund Ledger
          </h2>
          <p className="text-xs text-slate-400">
            Strict adherence to hotel cancellation policy (≥2 days: ₹500 full refund; 1 day/same day: ₹400 refund, ₹100 deduction).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Pending Refunds</span>
            <span className="text-lg font-bold font-serif-luxury text-amber-400">
              ₹{pendingRefundAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Completed Refunds</span>
            <span className="text-lg font-bold font-serif-luxury text-slate-200">
              ₹{totalRefundAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Refund ID</th>
                <th className="py-3 px-4">Booking Token</th>
                <th className="py-3 px-4">Cancellation Reason</th>
                <th className="py-3 px-4 text-right">Advance Paid</th>
                <th className="py-3 px-4 text-right">Deduction</th>
                <th className="py-3 px-4 text-right">Net Refund</th>
                <th className="py-3 px-4">Status & Txn Ref</th>
                <th className="py-3 px-4 text-center">Desk Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.map((r) => {
                const booking = bookings.find((b) => b.id === r.bookingId);
                return (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{r.id}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-white block">{r.bookingId}</span>
                      <span className="text-slate-400 text-[10px]">{booking?.guestName} ({booking?.guestPhone})</span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <span className="line-clamp-2 text-slate-300">{r.reason}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Approved by: {r.approvedByStaffName}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">₹{r.amountRequested}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-400 font-semibold">- ₹{r.deductionAmount}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      ₹{r.netRefundAmount}
                    </td>
                    <td className="py-3 px-4">
                      {r.refundStatus === 'completed' ? (
                        <div className="space-y-0.5">
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            Refunded
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            UTR: {r.transactionRef || 'N/A'}
                          </span>
                        </div>
                      ) : (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          Pending Payment
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.refundStatus === 'pending' ? (
                        <button
                          onClick={() => {
                            setSelectedRefund(r);
                            setRefundTxnRef('');
                          }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] transition-colors cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Completed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    No cancellation or refund records in system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle Refund Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold font-serif-luxury text-white">
              Settle Cancellation Refund (₹{selectedRefund.netRefundAmount})
            </h3>
            <p className="text-xs text-slate-400">
              Please enter the UPI transaction ID / UTR after sending the refund to the guest.
            </p>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Refund UPI Transaction Reference / UTR <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={refundTxnRef}
                  onChange={(e) => setRefundTxnRef(e.target.value)}
                  placeholder="e.g. 50928172910"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRefund(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleMarkRefunded(selectedRefund)}
                  disabled={markingDone}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2"
                >
                  {markingDone ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Confirm Settlement</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
