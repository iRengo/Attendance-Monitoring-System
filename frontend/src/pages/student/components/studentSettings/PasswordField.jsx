import { Eye, EyeOff } from "lucide-react";

export default function PasswordField({ label, name, value, onChange, show, toggleShow }) {
  return (
    <div className="relative">
      <label className="text-gray-600 text-sm">{label}</label>
      <input
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full mt-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:ring-2 focus:ring-[#3498db] focus:outline-none"
      />
      <button
        type="button"
        onClick={toggleShow}
        className="absolute right-3 top-8 text-gray-500"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}