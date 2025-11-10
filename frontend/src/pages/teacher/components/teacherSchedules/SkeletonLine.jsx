export default function SkeletonLine({ w = "w-40" }) {
    return <div className={`h-3 rounded ${w} bg-gray-200 animate-pulse`} />;
  }