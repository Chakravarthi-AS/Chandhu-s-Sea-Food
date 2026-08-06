type Props = {
  label?: string;
  compact?: boolean;
};

export function PageLoader({
  label = "Loading…",
  compact = false,
}: Props) {
  return (
    <div
      className={`page-loader${compact ? " page-loader--compact" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="spinner" aria-hidden />
      <p>{label}</p>
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-spinner" role="status" aria-live="polite">
      <span className="spinner spinner-sm" aria-hidden />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
