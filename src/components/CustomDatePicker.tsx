import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, CalendarDays } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (date: string) => void;
  placeholder?: string;
  darkMode?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate years range
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 41 }, (_, i) => currentYear - 20 + i);

export function CustomDatePicker({ value, onChange, placeholder = 'Select date', darkMode = false }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback to today
  const parseValue = (val: string) => {
    if (!val) {
      const today = new Date();
      return {
        year: today.getFullYear(),
        month: today.getMonth(),
        day: today.getDate()
      };
    }
    const parts = val.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1; // 0-indexed
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return { year: y, month: m, day: d };
      }
    }
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      day: today.getDate()
    };
  };

  const parsed = parseValue(value);

  // State for the currently viewed month/year in the calendar calendar picker
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);

  // Reset view to match parsed value when value changes or calendar opens
  useEffect(() => {
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
  }, [value, isOpen]);

  // Click outside to close helper
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const isoString = `${viewYear}-${formattedMonth}-${formattedDay}`;
    onChange(isoString);
    setIsOpen(false);
  };

  const handleTodaySelect = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  // Generate calendar grid days
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayIndex = (y: number, m: number) => new Date(y, m, 1).getDay(); // Sunday is 0

  const daysInCurrentMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayIndex = getFirstDayIndex(viewYear, viewMonth);

  const prevMonthIndex = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevYearIndex = viewMonth === 0 ? viewYear - 1 : viewYear;
  const daysInPrevMonth = getDaysInMonth(prevYearIndex, prevMonthIndex);

  const daysGrid: { day: number; type: 'prev' | 'current' | 'next'; key: string }[] = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysGrid.push({
      day: daysInPrevMonth - i,
      type: 'prev',
      key: `prev-${daysInPrevMonth - i}`
    });
  }

  // Current month days
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    daysGrid.push({
      day: i,
      type: 'current',
      key: `curr-${i}`
    });
  }

  // Next month leading days to fill up a full standard 42-day calendar grid (6 rows)
  const remaining = 42 - daysGrid.length;
  for (let i = 1; i <= remaining; i++) {
    daysGrid.push({
      day: i,
      type: 'next',
      key: `next-${i}`
    });
  }

  // Format button/display value
  const getDisplayValue = () => {
    if (!value) return placeholder;
    const parts = value.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const mIdx = parseInt(parts[1], 10) - 1;
      const d = parts[2];
      if (mIdx >= 0 && mIdx < 12) {
        return `${MONTHS[mIdx]} ${parseInt(d, 10)}, ${y}`;
      }
    }
    return value;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button - Completely prevents native keyboard/typing zoom & input */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm text-left flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
          darkMode
            ? 'bg-neutral-950 border-neutral-800 text-white hover:bg-neutral-900/'
            : 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50/50'
        }`}
      >
        <div className="flex items-center min-w-0">
          <CalendarIcon className="absolute left-3 h-4.5 w-4.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
          <span className={`truncate font-medium ${!value ? 'text-neutral-400 dark:text-neutral-500' : ''}`}>
            {getDisplayValue()}
          </span>
        </div>
      </button>

      {/* Floating or Inline Expandable Calendar Dropdown */}
      {isOpen && (
        <div
          className={`sm:absolute relative block z-10 sm:z-50 mt-1.5 w-full sm:w-80 rounded-2xl border p-4 shadow-lg sm:shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 ${
            darkMode
              ? 'bg-neutral-950 border-neutral-800 text-white shadow-black/80'
              : 'bg-white border-neutral-200 text-neutral-800 shadow-neutral-200/50'
          }`}
        >
          {/* Calendar Header with Month/Year Selection dropdowns */}
          <div className="flex items-center justify-between gap-2 mb-3">
            {/* Quick selectors or Chevron buttons */}
            <button
              type="button"
              onClick={handlePrevMonth}
              className={`p-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                darkMode
                  ? 'border-neutral-800 hover:bg-neutral-900 text-neutral-300'
                  : 'border-neutral-100 hover:bg-neutral-50 text-neutral-600'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className={`text-xs font-semibold rounded-lg px-1.5 py-1 bg-transparent border-0 outline-none focus:ring-1 focus:ring-indigo-500/30 cursor-pointer ${
                  darkMode ? 'text-white hover:bg-neutral-900' : 'text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx} className={darkMode ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-800'}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className={`text-xs font-semibold rounded-lg px-1.5 py-1 bg-transparent border-0 outline-none focus:ring-1 focus:ring-indigo-500/30 cursor-pointer ${
                  darkMode ? 'text-white hover:bg-neutral-900' : 'text-neutral-800 hover:bg-neutral-50'
                }`}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y} className={darkMode ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-800'}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className={`p-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                darkMode
                  ? 'border-neutral-800 hover:bg-neutral-900 text-neutral-300'
                  : 'border-neutral-100 hover:bg-neutral-50 text-neutral-600'
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Grid of Day values */}
          <div className="grid grid-cols-7 gap-1.5 justify-items-center">
            {daysGrid.map((item) => {
              const isSelected =
                item.type === 'current' &&
                viewYear === parsed.year &&
                viewMonth === parsed.month &&
                item.day === parsed.day;

              const isToday =
                item.type === 'current' &&
                viewYear === new Date().getFullYear() &&
                viewMonth === new Date().getMonth() &&
                item.day === new Date().getDate();

              let cellStyle = 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 font-medium';
              if (item.type !== 'current') {
                cellStyle = 'text-neutral-300 dark:text-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 text-[11px]';
              }
              if (isToday && !isSelected) {
                cellStyle += ' ring-1 ring-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold';
              }
              if (isSelected) {
                cellStyle = 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white font-bold scale-100 shadow-md shadow-indigo-500/20';
              }

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.type === 'current') {
                      handleDaySelect(item.day);
                    } else if (item.type === 'prev') {
                      // Navigate to previous month and select date
                      const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
                      const prevYearValue = viewMonth === 0 ? viewYear - 1 : viewYear;
                      const formattedMonth = String(prevMonthIdx + 1).padStart(2, '0');
                      const formattedDay = String(item.day).padStart(2, '0');
                      onChange(`${prevYearValue}-${formattedMonth}-${formattedDay}`);
                      setIsOpen(false);
                    } else if (item.type === 'next') {
                      // Navigate to next month and select date
                      const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
                      const nextYearValue = viewMonth === 11 ? viewYear + 1 : viewYear;
                      const formattedMonth = String(nextMonthIdx + 1).padStart(2, '0');
                      const formattedDay = String(item.day).padStart(2, '0');
                      onChange(`${nextYearValue}-${formattedMonth}-${formattedDay}`);
                      setIsOpen(false);
                    }
                  }}
                  className={`h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-lg flex items-center justify-center text-xs transition-all active:scale-90 cursor-pointer ${cellStyle}`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Quick Clear / Quick Actions panel */}
          <div className="flex items-center justify-between gap-2 mt-3.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-900">
            <button
              type="button"
              onClick={handleTodaySelect}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
