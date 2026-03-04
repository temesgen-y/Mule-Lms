import Link from 'next/link';

const metricCards = [
  {
    title: 'Total Students',
    value: '2,847',
    change: '+12% from last month',
    positive: true,
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
  },
  {
    title: 'Instructors',
    value: '64',
    change: '-5% from last month',
    positive: false,
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    title: 'Admins',
    value: '8',
    change: null,
    positive: true,
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Courses',
    value: '142',
    change: '+8% from last month',
    positive: true,
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: 'Enrollments',
    value: '5,231',
    change: '+15% from last month',
    positive: true,
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Active Users',
    value: '1,893',
    change: '+3% from last month',
    positive: true,
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    title: 'Pending Actions',
    value: '23',
    change: null,
    positive: true,
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Published Courses',
    value: '98',
    change: null,
    positive: true,
    icon: (
      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const recentActivity = [
  { user: 'John Doe', action: 'Registered as student', tag: 'registration', tagColor: 'bg-blue-100 text-blue-800', time: '2 min ago' },
  { user: 'Dr. Smith', action: "Created course 'Intro to CS'", tag: 'course', tagColor: 'bg-purple-100 text-purple-800', time: '15 min ago' },
  { user: 'Jane Wilson', action: 'Enrolled in Data Science 101', tag: 'enrollment', tagColor: 'bg-green-100 text-green-800', time: '1 hr ago' },
  { user: 'Admin Sarah', action: 'Deactivated user account', tag: 'admin', tagColor: 'bg-orange-100 text-orange-800', time: '2 hrs ago' },
  { user: 'Prof. Jones', action: "Published course 'ML Basics'", tag: 'course', tagColor: 'bg-purple-100 text-purple-800', time: '3 hrs ago' },
  { user: 'Mike Chen', action: 'Completed enrollment verification', tag: 'enrollment', tagColor: 'bg-green-100 text-green-800', time: '4 hrs ago' },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                {card.change && (
                  <p className={`text-sm mt-1 ${card.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {card.change}
                  </p>
                )}
              </div>
              <div className="shrink-0">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 px-5 pt-5 pb-3">Recent Activity</h2>
          <div className="overflow-y-auto max-h-[340px] px-5 pb-5">
            <ul className="space-y-3">
              {recentActivity.map((item, i) => (
                <li key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{item.user}</p>
                    <p className="text-sm text-gray-600">{item.action}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.tagColor}`}>
                        {item.tag}
                      </span>
                      <span className="text-xs text-gray-400">{item.time}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/admin/instructors?add=1"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Add Instructor
            </Link>
            <Link
              href="/admin/admins?add=1"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Add Admin
            </Link>
            <Link
              href="/admin/courses?create=1"
              className="flex items-center gap-2 w-full py-2.5 px-4 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Create Course
            </Link>
            <Link
              href="/admin/students"
              className="flex items-center gap-2 w-full py-2.5 px-4 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Students
            </Link>
            <Link
              href="/admin/reports"
              className="flex items-center gap-2 w-full py-2.5 px-4 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
