import React, { useState } from 'react';
import { Room, Booking, RoomCategory, INITIAL_ROOMS_INVENTORY } from '../../types/hotel';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, BedDouble, AlertCircle } from 'lucide-react';

interface Props {
  rooms: Room[];
  bookings: Booking[];
  onSelectSlot: (roomId: string, date: string) => void;
  onSelectBooking: (booking: Booking) => void;
}

export const RoomCalendarGrid: React.FC<Props> = ({
  rooms,
  bookings,
  onSelectSlot,
  onSelectBooking,
}) => {
  const [startDate, setStartDate] = useState(new Date());
  const [daysCount, setDaysCount] = useState<7 | 14>(14);
  const [categoryFilter, setCategoryFilter] = useState<'all' | RoomCategory>('all');

  const displayRooms = rooms && rooms.length > 0 ? rooms : INITIAL_ROOMS_INVENTORY;

  // Generate date array
  const dateList: Date[] = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dateList.push(d);
  }

  const navigateDates = (direction: 'prev' | 'next') => {
    const nextD = new Date(startDate);
    nextD.setDate(nextD.getDate() + (direction === 'next' ? 7 : -7));
    setStartDate(nextD);
  };

  const jumpToToday = () => {
    setStartDate(new Date());
  };

  // Filter rooms
  const filteredRooms = displayRooms.filter((r) => {
    if (categoryFilter === 'all') return true;
    return r.category === categoryFilter;
  });

  // Helper to find booking occupying room on a specific date
  const getBookingForRoomDate = (roomId: string, dateStr: string): Booking | undefined => {
    return bookings.find((b) => {
      if (
        b.status === 'cancelled' ||
        b.status === 'new_request' ||
        b.status === 'checked_out' ||
        b.status === 'refund_pending' ||
        b.status === 'refunded'
      ) {
        return false;
      }
      if (b.assignedRoomId !== roomId) return false;
      return dateStr >= b.checkInDate && dateStr < b.checkOutDate;
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold font-serif-luxury text-white">
            16-Room Timeline & Visual Calendar
          </h2>
          <p className="text-xs text-slate-400">
            Interactive room-by-room occupancy grid. Click any slot to allocate a booking or inspect active stay.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 text-xs rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Room Categories (16 Rooms)</option>
            <option value="Small AC">Small AC (6 Rooms)</option>
            <option value="Deluxe">Deluxe (4 Rooms)</option>
            <option value="Large Non-AC">Large Non-AC (4 Rooms)</option>
            <option value="Common">Common (2 Rooms)</option>
          </select>

          {/* Days View selector */}
          <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-1 text-xs">
            <button
              onClick={() => setDaysCount(7)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                daysCount === 7 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDaysCount(14)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                daysCount === 14 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              14 Days
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5 bg-slate-950 rounded-xl border border-slate-800 p-1">
            <button
              onClick={() => navigateDates('prev')}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Previous 7 Days"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={jumpToToday}
              className="px-2.5 py-1 text-xs font-semibold text-amber-300 hover:text-amber-200"
            >
              Today
            </button>
            <button
              onClick={() => navigateDates('next')}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Next 7 Days"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Status Key:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500"></span>
          <span className="text-slate-300">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500"></span>
          <span className="text-slate-300">Occupied (In-House)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-500"></span>
          <span className="text-slate-300">Reserved (Confirmed)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-500"></span>
          <span className="text-slate-300">Maintenance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-500"></span>
          <span className="text-slate-300">Cleaning</span>
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-3 w-40 sticky left-0 bg-slate-950 z-20 border-r border-slate-800 font-bold">
                  Room Particulars
                </th>
                {dateList.map((d, idx) => {
                  const dStr = d.toISOString().split('T')[0];
                  const isToday = dStr === new Date().toISOString().split('T')[0];
                  return (
                    <th
                      key={idx}
                      className={`py-2 px-2 text-center min-w-[75px] border-r border-slate-800/60 ${
                        isToday ? 'bg-amber-950/40 text-amber-300 font-bold' : ''
                      }`}
                    >
                      <span className="text-[10px] block uppercase font-mono">
                        {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                      </span>
                      <span className="text-xs font-bold font-mono">
                        {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80">
              {filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-800/30 transition-colors">
                  {/* Sticky Room Label */}
                  <td className="py-2.5 px-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm font-mono">Room {room.roomNumber}</span>
                      <span className="text-[10px] text-slate-400 font-mono">₹{room.baseRate}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                      <span className="truncate">{room.category}</span>
                      <span>{room.isAc ? 'AC' : 'Non-AC'}</span>
                    </div>
                  </td>

                  {/* Day Slots */}
                  {dateList.map((d, dIdx) => {
                    const dateStr = d.toISOString().split('T')[0];
                    const activeBooking = getBookingForRoomDate(room.id, dateStr);

                    let slotBg = 'bg-slate-950/40 hover:bg-emerald-950/40 cursor-pointer';
                    let content = null;

                    if (room.status === 'maintenance') {
                      slotBg = 'bg-rose-950/60 border border-rose-800/60';
                      content = (
                        <span className="text-[9px] font-bold text-rose-300 truncate block">
                          Maintenance
                        </span>
                      );
                    } else if (activeBooking) {
                      const isOccupied = activeBooking.status === 'checked_in';
                      slotBg = isOccupied
                        ? 'bg-amber-600/90 text-slate-950 font-bold shadow-sm'
                        : 'bg-blue-600/80 text-white font-semibold';

                      content = (
                        <div
                          onClick={() => onSelectBooking(activeBooking)}
                          className="p-1 rounded cursor-pointer truncate text-[10px] select-none"
                          title={`${activeBooking.guestName} (${activeBooking.status})`}
                        >
                          <span className="truncate block font-bold">{activeBooking.guestName}</span>
                          <span className="text-[8px] opacity-80 block truncate">
                            {isOccupied ? 'In-House' : 'Reserved'}
                          </span>
                        </div>
                      );
                    } else {
                      content = (
                        <button
                          onClick={() => onSelectSlot(room.id, dateStr)}
                          className="w-full h-full text-[10px] text-slate-600 hover:text-emerald-400 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          +
                        </button>
                      );
                    }

                    return (
                      <td
                        key={dIdx}
                        className={`py-1 px-1 text-center border-r border-slate-800/60 h-12 transition-all ${slotBg}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
