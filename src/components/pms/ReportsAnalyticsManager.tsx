import React, { useState } from 'react';
import { Booking, Payment, Refund, Room, StaffUser, INITIAL_ROOMS_INVENTORY } from '../../types/hotel';
import { logAuditEvent } from '../../services/db';
import { BarChart3, Download, IndianRupee, Calendar, TrendingUp, Users, RotateCcw, CheckCircle } from 'lucide-react';

interface Props {
  bookings: Booking[];
  payments: Payment[];
  refunds: Refund[];
  rooms: Room[];
  staffUser: StaffUser;
}

export const ReportsAnalyticsManager: React.FC<Props> = ({
  bookings,
  payments,
  refunds,
  rooms,
  staffUser,
}) => {
  const [reportType, setReportType] = useState<'collections' | 'occupancy' | 'arrivals_departures' | 'cancellations'>('collections');

  const todayStr = new Date().toISOString().split('T')[0];

  const displayRooms = rooms && rooms.length > 0 ? rooms : INITIAL_ROOMS_INVENTORY;

  // Financial collections
  const totalCollections = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const cashCollections = payments
    .filter((p) => p.paymentMethod === 'cash')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const upiCollections = payments
    .filter((p) => p.paymentMethod === 'upi' || p.paymentMethod === 'youpi_pg')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const otherCollections = totalCollections - cashCollections - upiCollections;

  // Occupancy metrics
  const occupiedCount = displayRooms.filter((r) => r.status === 'occupied').length;
  const occupancyRate = displayRooms.length > 0 ? Math.round((occupiedCount / displayRooms.length) * 100) : 0;

  // CSV Export utility
  const exportToCsv = async (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    await logAuditEvent(
      'DATA_EXPORT',
      'Report',
      filename,
      `Exported ${filename} CSV report (${rows.length} rows)`,
      staffUser
    );
  };

  const handleExportCurrent = () => {
    if (reportType === 'collections') {
      const headers = ['Payment ID', 'Booking ID', 'Amount (INR)', 'Method', 'Status', 'Transaction Ref', 'Date'];
      const rows = payments.map((p) => [
        p.id,
        p.bookingId,
        p.amount,
        p.paymentMethod,
        p.paymentStatus,
        p.transactionRef || '',
        p.createdAt,
      ]);
      exportToCsv('hotel-shyam-palace-collections', headers, rows);
    } else if (reportType === 'occupancy') {
      const headers = ['Room Number', 'Category', 'Floor', 'Tariff', 'AC', 'Current Status', 'Housekeeping', 'Current Guest'];
      const rows = rooms.map((r) => [
        r.roomNumber,
        r.category,
        r.floor,
        r.baseRate,
        r.isAc ? 'Yes' : 'No',
        r.status,
        r.housekeepingStatus,
        r.currentGuestName || 'None',
      ]);
      exportToCsv('hotel-shyam-palace-occupancy', headers, rows);
    } else if (reportType === 'arrivals_departures') {
      const headers = ['Booking ID', 'Guest Name', 'Phone', 'Room', 'Category', 'Check-in', 'Check-out', 'Status'];
      const rows = bookings.map((b) => [
        b.bookingId,
        b.guestName,
        b.guestPhone,
        b.assignedRoomId || 'Unassigned',
        b.roomCategory,
        b.checkInDate,
        b.checkOutDate,
        b.status,
      ]);
      exportToCsv('hotel-shyam-palace-arrivals-departures', headers, rows);
    } else {
      const headers = ['Refund ID', 'Booking ID', 'Amount Requested', 'Deduction', 'Net Refund', 'Reason', 'Status', 'Txn Ref'];
      const rows = refunds.map((r) => [
        r.id,
        r.bookingId,
        r.amountRequested,
        r.deductionAmount,
        r.netRefundAmount,
        r.reason,
        r.refundStatus,
        r.transactionRef || '',
      ]);
      exportToCsv('hotel-shyam-palace-cancellations-refunds', headers, rows);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold font-serif-luxury text-white">
            Reports & Financial Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Cash vs UPI ledger reconciliation, room occupancy analysis, and authorized CSV downloads.
          </p>
        </div>

        <button
          onClick={handleExportCurrent}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Export Active Report to CSV</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setReportType('collections')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            reportType === 'collections' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Daily Collections & Reconciliation
        </button>
        <button
          onClick={() => setReportType('occupancy')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            reportType === 'occupancy' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Room Occupancy & Utilization
        </button>
        <button
          onClick={() => setReportType('arrivals_departures')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            reportType === 'arrivals_departures' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Arrivals & Departures Movement
        </button>
        <button
          onClick={() => setReportType('cancellations')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            reportType === 'cancellations' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white bg-slate-900'
          }`}
        >
          Cancellations & Deductions
        </button>
      </div>

      {/* Report 1: Collections Breakdown */}
      {reportType === 'collections' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Ledger Collections</span>
              <span className="text-3xl font-bold font-serif-luxury text-white mt-1 block">
                ₹{totalCollections.toLocaleString('en-IN')}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">From {payments.length} verified transactions</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Cash at Counter</span>
              <span className="text-3xl font-bold font-serif-luxury text-emerald-400 mt-1 block">
                ₹{cashCollections.toLocaleString('en-IN')}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Physical counter drawer</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">UPI / Bank Transfers</span>
              <span className="text-3xl font-bold font-serif-luxury text-amber-400 mt-1 block">
                ₹{upiCollections.toLocaleString('en-IN')}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Verified via UTR</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4">Transaction UTR</th>
                  <th className="py-3 px-4">Staff Lead</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{p.id}</td>
                    <td className="py-3 px-4 font-mono">{p.bookingId}</td>
                    <td className="py-3 px-4 capitalize font-semibold">{p.paymentMethod}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{p.transactionRef || 'N/A'}</td>
                    <td className="py-3 px-4 text-slate-400">{p.recordedByStaffName || 'Desk Staff'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 2: Occupancy Analysis */}
      {reportType === 'occupancy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Rooms</span>
              <span className="text-3xl font-bold font-serif-luxury text-white mt-1 block">16 Rooms</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Occupancy Rate</span>
              <span className="text-3xl font-bold font-serif-luxury text-amber-400 mt-1 block">{occupancyRate}%</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">AC Rooms (10 total)</span>
              <span className="text-2xl font-bold font-serif-luxury text-slate-200 mt-1 block">
                {rooms.filter((r) => r.isAc && r.status === 'occupied').length} Occupied
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Non-AC Rooms (6 total)</span>
              <span className="text-2xl font-bold font-serif-luxury text-slate-200 mt-1 block">
                {rooms.filter((r) => !r.isAc && r.status === 'occupied').length} Occupied
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Report 3: Movement */}
      {reportType === 'arrivals_departures' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4">Booking</th>
                <th className="py-3 px-4">Guest</th>
                <th className="py-3 px-4">Room</th>
                <th className="py-3 px-4">Check-in</th>
                <th className="py-3 px-4">Check-out</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="py-3 px-4 font-mono font-bold text-amber-400">{b.bookingId}</td>
                  <td className="py-3 px-4">{b.guestName}</td>
                  <td className="py-3 px-4 font-semibold text-white">Room {b.assignedRoomId || b.roomCategory}</td>
                  <td className="py-3 px-4">{b.checkInDate}</td>
                  <td className="py-3 px-4">{b.checkOutDate}</td>
                  <td className="py-3 px-4 capitalize font-semibold">{b.status.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Report 4: Cancellations */}
      {reportType === 'cancellations' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4">Refund ID</th>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-right">Advance Paid</th>
                <th className="py-3 px-4 text-right">Deduction</th>
                <th className="py-3 px-4 text-right">Net Refund</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {refunds.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 px-4 font-mono font-bold text-amber-400">{r.id}</td>
                  <td className="py-3 px-4 font-mono">{r.bookingId}</td>
                  <td className="py-3 px-4">{r.reason}</td>
                  <td className="py-3 px-4 text-right font-mono">₹{r.amountRequested}</td>
                  <td className="py-3 px-4 text-right font-mono text-rose-400">-₹{r.deductionAmount}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">₹{r.netRefundAmount}</td>
                  <td className="py-3 px-4 uppercase font-bold text-[10px]">{r.refundStatus}</td>
                </tr>
              ))}
              {refunds.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No cancellation records in system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
