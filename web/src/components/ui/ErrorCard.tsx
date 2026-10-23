type ErrorCardProps = { message: string; onRetry?: () => void };

// A page-level error with an optional "Try again" button.
export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div className="a-card">
      <p className="a-error" role="alert">
        ⚠ {message}
      </p>
      {onRetry && (
        <div className="a-actions" style={{ marginTop: 12 }}>
          <button type="button" className="a-btn" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
