const STYLES: Record<string, string> = {
  published: "text-confirmed bg-confirmed/10",
  confirmed: "text-confirmed bg-confirmed/10",
  draft: "text-muted bg-muted/10",
  pending: "text-pending bg-pending/10",
  awaiting_code: "text-brassdim bg-brass/10",
  closed: "text-rejected bg-rejected/10",
  rejected: "text-rejected bg-rejected/10",
};

export default function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-widest2 ${
        STYLES[status] ?? "text-muted bg-muted/10"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
