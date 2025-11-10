export default function Tabs({ activeTab, setActiveTab }) {
    const tabButton = (id, label) => (
      <button
        onClick={() => setActiveTab(id)}
        className={`pb-3 font-semibold transition-colors ${
          activeTab === id
            ? "text-[#415CA0] border-b-2 border-[#415CA0]"
            : "text-gray-400 hover:text-[#415CA0]"
        }`}
      >
        {label}
      </button>
    );
    return (
      <div className="flex border-b border-[#415CA0] mb-6 gap-6">
        {tabButton("account", "Account")}
        {tabButton("profile", "Profile")}
      </div>
    );
  }