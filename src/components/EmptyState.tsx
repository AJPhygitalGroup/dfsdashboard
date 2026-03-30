"use client";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center">
      <p className="text-4xl mb-3">{icon}</p>
      <h3 className="text-lg font-semibold text-[#1a3a5f] mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 bg-[#1a3a5f] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#0f2a4a] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
