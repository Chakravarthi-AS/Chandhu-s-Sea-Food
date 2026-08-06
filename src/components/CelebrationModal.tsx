"use client";

type Props = {
  open: boolean;
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

export function CelebrationModal({
  open,
  title,
  message,
  detail,
  confirmLabel = "Continue",
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop celebrate-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel celebrate-modal">
        <div className="celebrate-icon" aria-hidden>
          🌊
        </div>
        <h2>{title}</h2>
        <p className="celebrate-message">{message}</p>
        {detail ? <p className="celebrate-detail">{detail}</p> : null}
        <button type="button" className="btn btn-primary btn-block" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
