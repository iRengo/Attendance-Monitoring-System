export default function CardBox({ title, value, subtitle }) {
  return (
    <div className="bg-white shadow rounded p-4 flex flex-col justify-center items-center">
      <h3 className="text-lg text-black font-bold">{value}</h3>
      <p className="text-sm text-black font-semibold">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
