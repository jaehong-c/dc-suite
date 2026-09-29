// Waiting state shared by the modules: a spinner, what is happening, and
// how long it usually takes, so a 20-second model call does not look stuck.
export default function Working({ label, hint = "Usually 10 to 30 seconds." }) {
  return (
    <div className="mt-4 flex items-center gap-3 text-[13px] text-[var(--ink-2)]" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>
        {label} <span className="text-[var(--ink-3)]">{hint}</span>
      </span>
    </div>
  );
}
