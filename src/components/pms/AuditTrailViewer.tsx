import React, { useState } from 'react';
import { AuditLog } from '../../types/hotel';
import { ScrollText, Search, ShieldAlert, Clock, User, Filter } from 'lucide-react';

interface Props {
  logs: AuditLog[];
}

export const AuditTrailViewer: React.FC<Props> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filtered = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesSearch =
      !q ||
      log.details.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q) ||
      log.reason?.toLowerCase().includes(q);

    return matchesAction && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold font-serif-luxury text-white">
            Operational Audit Trail
          </h2>
          <p className="text-xs text-slate-400">
            Immutable chronological logging of all check-ins, status overrides, payment entries, refunds, and room assignments.
          </p>
        </div>

        <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Audit Events</span>
          <span className="text-lg font-bold font-serif-luxury text-amber-300">{logs.length}</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, action, room, token, reason..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
        >
          <option value="all">All Audit Actions</option>
          <option value="WALK_IN_CHECK_IN">Walk-In Check-In</option>
          <option value="PHONE_RESERVATION_CREATED">Phone Reservation</option>
          <option value="RESERVATION_CHECK_IN">Check-In</option>
          <option value="CHECK_OUT">Check-Out & Invoice</option>
          <option value="PAYMENT_RECORDED">Payment Recording</option>
          <option value="BOOKING_CANCELLED">Cancellation & Refund</option>
          <option value="ROOM_STATUS_OVERRIDE">Room Status Override</option>
          <option value="INVENTORY_UPDATED">Inventory Update</option>
          <option value="SETTINGS_UPDATED">Settings Update</option>
          <option value="DATA_EXPORT">Data Export</option>
        </select>
      </div>

      {/* Audit List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Staff Member & Role</th>
                <th className="py-3 px-4">Entity Ref</th>
                <th className="py-3 px-4">Action Particulars</th>
                <th className="py-3 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-amber-300 font-mono text-[11px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-white block">{log.actorName}</span>
                    <span className="text-[10px] text-slate-400 uppercase">{log.actorRole}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    <span className="text-slate-500 text-[10px] block">{log.entityType}</span>
                    {log.entityId}
                  </td>
                  <td className="py-3 px-4 max-w-sm">
                    <span className="text-slate-200 line-clamp-2">{log.details}</span>
                  </td>
                  <td className="py-3 px-4 max-w-xs text-slate-400 italic">
                    {log.reason || '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    No matching audit records.
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
