import {
  structureStatusMeta,
  type StructureStatus,
} from "@/app/lib/status";

type StatusBadgeProps = {
  status: StructureStatus;
};

const statusDotClasses: Record<StructureStatus, string> = {
  maintained: "bg-sky-500",
  renamed: "bg-emerald-500",
  new: "bg-violet-500",
  removed: "bg-rose-500",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const meta = structureStatusMeta[status];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${statusDotClasses[status]}`}
      />
      {meta.label}
    </span>
  );
}
