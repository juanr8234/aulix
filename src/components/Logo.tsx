interface LogoProps {
  size?: number;
  showWord?: boolean;
  className?: string;
}

/**
 * Logo de Aulix. "A" geométrica minimalista con un acento celeste —
 * mismo diseño que el ícono de la app y el instalador.
 */
export default function Logo({ size = 36, showWord = false, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 512 512" fill="none" aria-label="Aulix">
        <rect width="512" height="512" rx="120" fill="#0F172A" />
        {/* A geométrica */}
        <path d="M256 96L384 384H326L294 306H218L186 384H128L256 96Z" fill="#F8FAFC" />
        {/* Corte interno */}
        <path d="M256 190L236 244H276L256 190Z" fill="#0F172A" />
        {/* Acento celeste */}
        <circle cx="372" cy="140" r="18" fill="#38BDF8" />
      </svg>
      {showWord && (
        <span className="display text-xl text-ink tracking-tight leading-none">Aulix</span>
      )}
    </div>
  );
}
