'use client';

export default function MessagesPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Messages</h1>
      <p className="text-gray-600 text-sm mb-6">Your messages will appear here.</p>
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 text-sm">
        No messages yet.
      </div>
    </div>
  );
}
