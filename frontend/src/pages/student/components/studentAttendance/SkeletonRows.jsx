export default function SkeletonRows({ rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-3 py-3">
            <div className="h-3.5 w-20 bg-gray-200 rounded" />
          </td>
          <td className="px-3 py-3">
            <div className="h-3.5 w-28 bg-gray-200 rounded" />
          </td>
          <td className="px-3 py-3">
            <div className="h-5 w-16 bg-gray-200 rounded-full" />
          </td>
          <td className="px-3 py-3">
            <div className="h-3.5 w-28 bg-gray-200 rounded" />
          </td>
          <td className="px-3 py-3">
            <div className="h-3.5 w-24 bg-gray-200 rounded" />
          </td>
        </tr>
      ))}
    </>
  );
}