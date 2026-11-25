import Skeleton, { SkeletonBar } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="page">
      <div className="shell grid gap-4" style={{ maxWidth: "52rem" }}>
        <div className="grid gap-3 max-w-2xl">
          <SkeletonBar width="7rem" height="0.7rem" />
          <SkeletonBar width="60%" height="2rem" />
          <SkeletonBar width="90%" />
          <SkeletonBar width="75%" />
        </div>
        <div className="grid gap-3 mt-4">
          <Skeleton lines={2} />
          <Skeleton lines={3} />
          <Skeleton lines={2} />
        </div>
      </div>
    </main>
  );
}
