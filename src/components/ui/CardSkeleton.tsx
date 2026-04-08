import { Skeleton } from "./skeleton";

/** Generic card skeleton for lists */
export const CardSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card-base space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40 bg-surface-3" />
          <Skeleton className="h-5 w-16 rounded-full bg-surface-3" />
        </div>
        <Skeleton className="h-3 w-3/4 bg-surface-3" />
      </div>
    ))}
  </div>
);

/** Stat card skeleton */
export const StatSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card-base flex flex-col items-start gap-2">
        <Skeleton className="h-5 w-5 rounded bg-surface-3" />
        <Skeleton className="h-3 w-16 bg-surface-3" />
        <Skeleton className="h-7 w-12 bg-surface-3" />
      </div>
    ))}
  </div>
);

/** Table row skeleton */
export const TableRowSkeleton = ({ cols = 6, rows = 5 }: { cols?: number; rows?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} style={{ borderColor: "hsl(var(--border-subtle))" }}>
        {Array.from({ length: cols }).map((_, c) => (
          <td key={c} className="px-4 py-3">
            <Skeleton className="h-4 w-full bg-surface-3" style={{ maxWidth: c === 0 ? 20 : 100 }} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/** Chart area skeleton */
export const ChartSkeleton = () => (
  <div className="card-base mt-3" style={{ height: 260 }}>
    <div className="flex items-end gap-2 h-full p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1 bg-surface-3 rounded-t"
          style={{ height: `${30 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  </div>
);
