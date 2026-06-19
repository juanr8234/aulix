import { hexToRgba } from '../lib/utils';
import { useStore } from '../store';
import { useT } from '../lib/i18n';

export default function SubjectChip({ subjectId, fallback }: { subjectId: string | null; fallback?: string }) {
  const t = useT();
  const subjects = useStore((s) => s.subjects);
  const subj = subjects.find((s) => s.id === subjectId);
  if (!subj) {
    return <span className="chip bg-bg-soft text-ink-dim">{fallback ?? t('notes.noSubject')}</span>;
  }
  return (
    <span
      className="chip"
      style={{ backgroundColor: hexToRgba(subj.color, 0.18), color: subj.color, border: `1px solid ${hexToRgba(subj.color, 0.4)}` }}
    >
      {subj.name}
    </span>
  );
}
