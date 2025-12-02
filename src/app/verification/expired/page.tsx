export default function ExpiredPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
      <div className="bg-white w-full max-w-xl py-20 px-10 rounded-2xl shadow-xl text-center">

        {/* Icon */}
        <div className="mx-auto mb-10 w-28 h-28 rounded-full border-4 border-red-600 flex items-center justify-center">
          <svg
            className="w-16 h-16 text-red-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* Text */}
        <h1 className="text-3xl font-bold text-gray-900">Link Expired</h1>
        <p className="text-gray-600 mt-4 text-lg">
          This verification link is no longer valid.
        </p>

      </div>
    </div>
  );
}
