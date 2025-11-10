export default function LivenessBadge({
    faceMessage,
    faceOk,
    spoofSuspected,
    canCapture,
  }) {
    const baseClasses = "absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium";
    let color = "bg-gray-700 text-white";
    if (canCapture) color = "bg-green-600 text-white";
    else if (spoofSuspected) color = "bg-yellow-600 text-white";
    else if (faceOk) color = "bg-indigo-600 text-white";
    return <div className={`${baseClasses} ${color}`}>{faceMessage}</div>;
  }