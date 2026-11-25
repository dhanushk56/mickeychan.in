import { SkeletonBar, SkeletonGrid } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <section className="page">
      <div className="shell grid gap-4">
        <div className="grid gap-3 max-w-2xl">
          <SkeletonBar width="8rem" height="0.7rem" />
          <SkeletonBar width="55%" height="2rem" />
          <SkeletonBar width="85%" />
        </div>
        <SkeletonGrid count={6} className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    </section>
  );
}
