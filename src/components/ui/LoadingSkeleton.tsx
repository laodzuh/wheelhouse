import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-gray-800",
        className
      )}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-700/50 bg-gray-900 p-4"
          >
            <Bone className="mb-2 h-3 w-20" />
            <Bone className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-700/50 bg-gray-900 p-4">
          <Bone className="mb-4 h-4 w-32" />
          <Bone className="h-48 w-full" />
        </div>
        <div className="rounded-xl border border-gray-700/50 bg-gray-900 p-4">
          <Bone className="mb-4 h-4 w-32" />
          <Bone className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

export function TradeTableSkeleton() {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-900">
      <div className="border-b border-gray-700/50 px-4 py-3">
        <Bone className="h-4 w-full" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-gray-800 px-4 py-3"
        >
          <Bone className="h-4 w-16" />
          <Bone className="h-4 w-12" />
          <Bone className="h-4 w-20" />
          <Bone className="h-4 w-16" />
          <Bone className="h-4 w-14" />
          <Bone className="h-4 w-20 ml-auto" />
        </div>
      ))}
    </div>
  );
}
