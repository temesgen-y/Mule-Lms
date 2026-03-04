'use client';

import { useState, useMemo } from 'react';

type ViewMode = '1' | '2' | 'all';

const ACTIVITIES = [
  { id: '1', label: 'Summary of Current Cou...', startDay: 0, span: 2, color: 'bg-blue-500' },
  { id: '2', label: 'Class Introductions', startDay: 0, span: 1, color: 'bg-blue-500' },
  { id: '3', label: 'Topic 1 DQ 1', startDay: 1, span: 1, color: 'bg-blue-500' },
  { id: '4', label: 'Topic 1 DQ 2', startDay: 2, span: 1, color: 'bg-blue-500' },
  { id: '5', label: 'Incoming Lopes', startDay: 3, span: 2, color: 'bg-orange-500' },
  { id: '6', label: 'Quiz Practice', startDay: 4, span: 1, color: 'bg-pink-500' },
  { id: '7', label: 'Topic 1 Participation', startDay: 5, span: 2, color: 'bg-green-500', badge: 1 },
];

function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export default function InstructorDashboardPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('2');

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const isCurrentWeek = weekOffset === 0;
  const displayDates = viewMode === '1' ? weekDates.slice(0, 1) : viewMode === '2' ? weekDates.slice(0, 2) : weekDates;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>

      <div className="flex flex-wrap items-center gap-4 mt-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Weeks</span>
          <button
            type="button"
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-1.5 rounded border border-gray-200 hover:bg-gray-50"
            aria-label="Previous week"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium text-sm">1</span>
          <button
            type="button"
            onClick={() => setWeekOffset((o) => o + 1)}
            className="p-1.5 rounded border border-gray-200 hover:bg-gray-50"
            aria-label="Next week"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className={`ml-2 px-3 py-1.5 rounded text-sm font-medium ${
              isCurrentWeek ? 'bg-primary text-white' : 'border border-gray-200 hover:bg-gray-50'
            }`}
          >
            CURRENT (WEEK 1)
          </button>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-sm text-gray-600 mr-2">Show</span>
          {(['1', '2', 'all'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                viewMode === mode ? 'bg-primary text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              {mode === 'all' ? 'ALL' : `${mode} WEEK${mode === '1' ? '' : 'S'}`}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="grid grid-cols-7 min-w-[600px]">
          {displayDates.map((d) => (
            <div
              key={d.toISOString()}
              className="border-b border-r border-gray-200 p-2 text-center bg-gray-50/50 last:border-r-0"
            >
              <div className="text-xs font-medium text-gray-500">
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
        <div
          className="min-h-[320px] p-4"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${displayDates.length}, minmax(0, 1fr))`,
            gap: '0.5rem 0',
            alignContent: 'start',
          }}
        >
          {ACTIVITIES.map((act) => {
            const start = Math.min(act.startDay, displayDates.length - 1);
            const span = Math.min(act.span, displayDates.length - start);
            return (
              <div
                key={act.id}
                className={`flex items-center gap-2 px-3 py-2 rounded ${act.color} text-white text-sm font-medium min-w-0`}
                style={{
                  gridColumn: `span ${span}`,
                  gridColumnStart: start + 1,
                }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate">{act.label}</span>
                {act.badge != null && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold flex items-center justify-center shrink-0">
                    {act.badge}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
