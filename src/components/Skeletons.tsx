export function CardSkeleton() {
  return (
    <div className="flex-none w-[195px] sm:w-[210px] md:w-[230px]">
      <div className="bg-white border border-neutral-200/80 rounded-xl overflow-hidden flex flex-col">
        <div className="aspect-[4/3] bg-neutral-100 skeleton-shimmer" />
        <div className="p-3.5 flex flex-col flex-1">
          <div className="min-h-[38px] mb-2 space-y-1.5">
            <div className="h-3.5 bg-neutral-100 rounded skeleton-shimmer w-[90%]" />
            <div className="h-3.5 bg-neutral-100 rounded skeleton-shimmer w-[65%]" />
          </div>
          <div className="h-3 bg-neutral-100 rounded skeleton-shimmer w-[55%] mb-1.5" />
          <div className="h-3 bg-neutral-100 rounded skeleton-shimmer w-[40%] mb-1.5" />
          <div className="h-2.5 bg-neutral-100 rounded skeleton-shimmer w-[50%] mb-2.5" />
          <div className="pt-2.5 border-t border-neutral-100">
            <div className="h-4 bg-neutral-100 rounded skeleton-shimmer w-[35%]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mb-6 md:mb-10">
      <div className="px-4 md:px-6 mb-3 md:mb-5">
        <div className="h-6 bg-neutral-100 rounded skeleton-shimmer w-48 mb-2" />
        <div className="h-1 w-10 md:w-14 bg-neutral-100 rounded-full skeleton-shimmer" />
      </div>
      <div className="flex gap-3 md:gap-3.5 overflow-hidden px-4 md:px-6">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ExplorePageSkeleton() {
  return (
    <div>
      <div className="border-b border-neutral-200 bg-white">
        <div className="px-4 md:px-6 py-2 md:py-3">
          <div className="max-w-5xl mx-auto flex items-center gap-2 md:gap-3">
            <div className="flex-1 h-10 md:h-11 bg-neutral-100 rounded-full skeleton-shimmer" />
            <div className="w-20 md:w-28 h-10 md:h-11 bg-neutral-100 rounded-full skeleton-shimmer" />
          </div>
        </div>
      </div>
      <div className="pt-6 md:pt-8 pb-12 md:pb-16">
        <CardRowSkeleton />
        <CardRowSkeleton count={5} />
        <CardRowSkeleton count={4} />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 bg-neutral-100 rounded skeleton-shimmer w-48" />
        <div className="h-9 bg-neutral-100 rounded skeleton-shimmer w-28" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-neutral-100 rounded-lg skeleton-shimmer" />
        ))}
      </div>
      <div className="h-64 bg-neutral-100 rounded-lg skeleton-shimmer" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-neutral-100 rounded skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-10 bg-neutral-100 rounded skeleton-shimmer" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 bg-neutral-100 rounded skeleton-shimmer" style={{ opacity: 1 - i * 0.08 }} />
      ))}
    </div>
  );
}
