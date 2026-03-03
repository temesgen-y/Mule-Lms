import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Admin-only area. Instructor and user management will be added here.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-block text-[#4c1d95] font-medium hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
