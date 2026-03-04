'use client';

import { useState } from 'react';
import Link from 'next/link';

type Instructor = {
  id: string;
  fullName: string;
  email: string;
  department: string;
  title: string;
  status: 'Active' | 'Inactive';
};

const mockInstructors: Instructor[] = [
  { id: '1', fullName: 'Dr. Smith', email: 'instructor1@university.edu', department: 'Computer Science', title: 'Associate Professor', status: 'Active' },
  { id: '2', fullName: 'Prof. Jones', email: 'instructor2@university.edu', department: 'Mathematics', title: 'Professor', status: 'Active' },
  { id: '3', fullName: 'Dr. Williams', email: 'instructor3@university.edu', department: 'Physics', title: 'Assistant Professor', status: 'Inactive' },
  { id: '4', fullName: 'Prof. Garcia', email: 'instructor4@university.edu', department: 'Biology', title: 'Professor', status: 'Active' },
  { id: '5', fullName: 'Dr. Brown', email: 'instructor5@university.edu', department: 'Computer Science', title: 'Lecturer', status: 'Active' },
  { id: '6', fullName: 'Prof. Taylor', email: 'instructor6@university.edu', department: 'Mathematics', title: 'Associate Professor', status: 'Inactive' },
  { id: '7', fullName: 'Dr. Martinez', email: 'instructor7@university.edu', department: 'Physics', title: 'Professor', status: 'Active' },
  { id: '8', fullName: 'Prof. Anderson', email: 'instructor8@university.edu', department: 'Biology', title: 'Assistant Professor', status: 'Active' },
  { id: '9', fullName: 'Dr. Thomas', email: 'instructor9@university.edu', department: 'Computer Science', title: 'Professor', status: 'Active' },
  { id: '10', fullName: 'Prof. Jackson', email: 'instructor10@university.edu', department: 'Mathematics', title: 'Lecturer', status: 'Inactive' },
];

const totalCount = 24;
const pageSize = 10;

export default function AdminInstructorsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = mockInstructors.filter(
    (i) =>
      i.fullName.toLowerCase().includes(search.toLowerCase()) ||
      i.email.toLowerCase().includes(search.toLowerCase()) ||
      i.department.toLowerCase().includes(search.toLowerCase()) ||
      i.title.toLowerCase().includes(search.toLowerCase())
  );
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, totalCount);
  const canPrev = page > 1;
  const canNext = page < Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Search and action bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <input
            type="search"
            placeholder="Search instructors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <Link
          href="/admin/instructors/add"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Instructor
        </Link>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Full Name</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Email</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Department</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Title</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Status</th>
                <th className="text-left text-sm font-semibold text-gray-700 px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((instructor) => (
                <tr key={instructor.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{instructor.fullName}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{instructor.email}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{instructor.department}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{instructor.title}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-sm font-medium ${
                        instructor.status === 'Active' ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      {instructor.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                        title="View"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-red-600"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50/50">
          <p className="text-sm text-gray-600">
            Showing {start + 1}-{end} of {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canPrev}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Previous page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNext}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Next page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
