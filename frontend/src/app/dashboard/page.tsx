'use client';

import { useState } from 'react';
import Link from 'next/link';

// Demo data for current class — replace with API data later
const CURRENT_CLASSES = [
  {
    id: 'swe-520-0500',
    topic: 'Topic 4 SWE-520-0500',
    title: 'Advanced Software Engineering Fundamentals',
    startDate: 'Dec 18, 2025',
    endDate: 'Feb 18, 2026',
    instructor: 'Curtis Thompson',
    studentCount: 7,
  },
];

const PAST_CLASSES: Array<{ id: string; topic: string; title: string; instructor: string }> = [];

export default function StudentHomePage() {
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Title */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl" aria-hidden>🏠</span>
        <h1 className="text-2xl font-bold text-gray-900">Student Home</h1>
      </div>
      <p className="text-gray-600 text-sm mb-1">
        Students will see their classes in Mule LMS three days before each class&apos;s start date.
      </p>
      <p className="text-gray-600 text-sm mb-6">
        <Link href="/dashboard/schedule" className="text-[#0078d4] hover:underline">
          Missing a class? View your full schedule.
        </Link>
      </p>

      {/* Tabs - purple underline on active */}
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'current'
              ? 'border-[#4c1d95] text-[#4c1d95]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          CURRENT CLASSES ({CURRENT_CLASSES.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'past'
              ? 'border-[#4c1d95] text-[#4c1d95]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          PAST CLASSES ({PAST_CLASSES.length})
        </button>
      </div>

      {/* Horizontal line above class cards - full width */}
      <div className="w-screen relative left-1/2 -ml-[50vw] border-t border-gray-200" />
      <div className="pt-4">
      {/* Current classes - card with yellow top bar, gray topic, blue 7 Students link, GO TO CLASS centered */}
      {activeTab === 'current' && (
        <div className="space-y-4">
          {CURRENT_CLASSES.length === 0 ? (
            <p className="text-gray-500 text-sm">You have no current classes.</p>
          ) : (
            CURRENT_CLASSES.map((course) => (
              <article
                key={course.id}
                className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden"
              >
                <div className="h-3 bg-[#FEF08A]" aria-hidden />
                <div className="px-5 py-4">
                  <p className="text-gray-600 text-sm mb-3">{course.topic}</p>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">{course.title}</h2>
                  <div className="flex flex-wrap gap-5 text-sm text-gray-700 mb-4">
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-500" aria-hidden>📅</span>
                      {course.startDate} - {course.endDate}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-500" aria-hidden>🎓</span>
                      {course.instructor}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-gray-500" aria-hidden>👥</span>
                      <span className="text-[#1565C0] font-medium hover:underline cursor-pointer">
                        {course.studentCount} Students
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-center pt-1">
                    <Link
                      href={`/dashboard/class/${course.id}`}
                      className="inline-flex items-center justify-center px-8 py-3 rounded-lg bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold text-sm uppercase tracking-wide"
                    >
                      GO TO CLASS
                    </Link>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* Past classes */}
      {activeTab === 'past' && (
        <div className="space-y-4">
          {PAST_CLASSES.length === 0 ? (
            <p className="text-gray-500 text-sm">You have no past classes.</p>
          ) : (
            PAST_CLASSES.map((course) => (
              <article
                key={course.id}
                className="bg-white border border-gray-200 rounded-lg shadow-sm p-5"
              >
                <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium mb-2">
                  {course.topic}
                </span>
                <h2 className="text-lg font-semibold text-gray-900">{course.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{course.instructor}</p>
              </article>
            ))
          )}
        </div>
      )}
      </div>
    </div>
  );
}
