/**
 * Loading Skeletons for Notes Dashboard
 */
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function NotesSkeletons() {
  return (
    <div className="space-y-6">
      {/* Toolbar Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1 min-w-[200px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-3 w-1/3 mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function NoteCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-3 w-1/3 mt-4" />
      </CardContent>
    </Card>
  );
}

