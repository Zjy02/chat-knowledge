interface LogoProps {
  compact?: boolean;
}

export function Logo({ compact = false }: LogoProps) {
  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true">
        知
      </div>
      {!compact && (
        <div>
          <div className="brand-name">知问</div>
          <div className="brand-sub">Knowledge AI</div>
        </div>
      )}
    </div>
  );
}
