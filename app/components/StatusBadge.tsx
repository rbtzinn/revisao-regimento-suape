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
      className={`font-utility inline-flex shrink-0 items-center gap-1.5 rounded-[3px] border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] sm:text-[11px] ${meta.className}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 ${statusDotClasses[status]}`}
      />
      {meta.label}
    </span>
  );
}
