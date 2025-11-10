export default function AccountInfo({ loading, studentData }) {
    return (
      <div className="lg:col-span-2 bg-white shadow-md rounded-xl p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Account Information</h2>
        {loading ? (
          <p className="text-gray-500">Loading account info...</p>
        ) : (
          <div className="space-y-5">
            {["firstname", "middlename", "lastname", "school_email"].map((field) => (
              <div key={field}>
                <label className="text-gray-600 text-sm capitalize">
                  {field.replace("_", " ")}
                </label>
                <input
                  type="text"
                  value={studentData[field]}
                  readOnly
                  className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800 cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }