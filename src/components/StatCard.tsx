interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  color = "#1a3a5f",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-5 border-l-4" style={{ borderLeftColor: color }}>
      <p className="text-xs sm:text-sm text-gray-500 font-medium leading-tight">{title}</p>
      <p className="text-xl sm:text-3xl font-bold mt-1" style={{ color }}>
        {value}
      </p>
      {subtitle && <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
