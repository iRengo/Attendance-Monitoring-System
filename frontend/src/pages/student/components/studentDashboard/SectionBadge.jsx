export default function SectionBadge({ computedKey }) {
    if (!computedKey) return null;
    return (
      <div className="text-sm text-gray-500">
        Section: {computedKey}
      </div>
    );
  }