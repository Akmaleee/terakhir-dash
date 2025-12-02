export default function InvalidApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-md w-full border border-gray-100">
        
        {/* Icon */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-red-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">
          Invalid Link
        </h1>

        {/* Description */}
        <p className="text-gray-600 mt-3 leading-relaxed">
          This approval link is no longer valid.  
          It may have expired or was already used.
        </p>
      </div>
    </div>
  );
}
