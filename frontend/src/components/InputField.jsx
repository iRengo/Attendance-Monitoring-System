export default function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  className = "",
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[#5F75AF]">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full border-2 border-[#5F75AF] rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5F75AF] text-[#5F75AF] placeholder-[#5F75AF] ${className}`}
      />
    </div>
  );
}
