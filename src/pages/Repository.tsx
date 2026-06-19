import { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, ExternalLink, Link as LinkIcon, X, BookOpen } from 'lucide-react';
import { useStore } from '../store';
import { hexToRgba, formatDate } from '../lib/utils';
import { useT } from '../lib/i18n';
import type { RepoLink, Subject } from '../types';
import Modal from '../components/Modal';

function hostFromUrl(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

interface FormState {
  id?: string;
  title: string;
  url: string;
  subjectId: string | null;
}

const empty: FormState = { title: '', url: '', subjectId: null };

export default function Repository() {
  const t = useT();
  const links = useStore((s) => s.links);
  const subjects = useStore((s) => s.subjects);
  const addLink = useStore((s) => s.addLink);
  const updateLink = useStore((s) => s.updateLink);
  const removeLink = useStore((s) => s.removeLink);

  const [q, setQ] = useState('');
  const [filterSubject, setFilterSubject] = useState<string | 'all'>('all');
  const [editing, setEditing] = useState<FormState | null>(null);
  const [selected, setSelected] = useState<RepoLink | null>(null);

  const subjectMap = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])) as Record<string, Subject>, [subjects]);

  const filtered = useMemo(() => {
    return links.filter((l) => {
      if (filterSubject !== 'all' && l.subjectId !== filterSubject) return false;
      if (!q) return true;
      const term = q.toLowerCase();
      return l.title.toLowerCase().includes(term) || l.url.toLowerCase().includes(term);
    });
  }, [links, q, filterSubject]);

  function save() {
    if (!editing) return;
    const ti = editing.title.trim();
    const u = editing.url.trim();
    if (!ti || !u) return;
    if (editing.id) updateLink(editing.id, { title: ti, url: u, subjectId: editing.subjectId });
    else addLink({ title: ti, url: u, subjectId: editing.subjectId });
    setEditing(null);
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('repository.title')}</h1>
          <p className="text-sm text-ink-dim mt-1">{t('repository.subtitle')}</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ ...empty })}>
          <Plus className="w-4 h-4" /> {t('repository.add')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[260px] max-w-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input
            className="input pl-9"
            placeholder={t('repository.searchPh')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="input max-w-[220px]"
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value as any)}
        >
          <option value="all">{t('repository.allSubjects')}</option>
          <option value="">— {t('repository.general')}</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-ink-dim">
          {links.length === 0 ? t('repository.emptyNone') : t('repository.emptyFilter')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((l) => {
            const subj = l.subjectId ? subjectMap[l.subjectId] : null;
            return (
              <article
                key={l.id}
                onClick={() => setSelected(l)}
                className="card p-4 relative group cursor-pointer hover:border-brand/40 transition"
                style={subj ? { borderLeft: `4px solid ${subj.color}` } : undefined}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg grid place-items-center shrink-0"
                    style={{ background: subj ? hexToRgba(subj.color, 0.18) : 'rgba(59,130,246,0.15)' }}
                  >
                    {subj ? <BookOpen className="w-5 h-5" style={{ color: subj.color }} /> : <LinkIcon className="w-5 h-5 text-brand" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ink truncate">{l.title}</h3>
                    <p className="text-xs text-ink-mute truncate mt-0.5">{hostFromUrl(l.url)}</p>
                    <p className="text-[11px] text-ink-mute mt-1">{subj ? subj.name : t('repository.general')}</p>
                  </div>
                </div>

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    className="btn-ghost !p-1.5"
                    onClick={(e) => { e.stopPropagation(); setEditing({ id: l.id, title: l.title, url: l.url, subjectId: l.subjectId }); }}
                    aria-label={t('common.edit')}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="btn-ghost !p-1.5 hover:!text-red-400"
                    onClick={(e) => { e.stopPropagation(); if (confirm(t('common.confirmDelete', { name: l.title }))) removeLink(l.id); }}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-40" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-bg-card border-l border-line shadow-soft flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="font-semibold">{t('repository.detail')}</h3>
              <button className="btn-ghost !p-1.5" onClick={() => setSelected(null)} aria-label={t('common.close')}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              <div>
                <div className="label">{t('repository.fieldTitle')}</div>
                <div className="text-lg font-semibold">{selected.title}</div>
              </div>
              <div>
                <div className="label">{t('repository.fieldSubject')}</div>
                {selected.subjectId && subjectMap[selected.subjectId] ? (
                  <span className="chip" style={{ background: hexToRgba(subjectMap[selected.subjectId].color, 0.2), color: subjectMap[selected.subjectId].color }}>
                    {subjectMap[selected.subjectId].name}
                  </span>
                ) : (
                  <span className="text-sm text-ink-dim">{t('repository.general')}</span>
                )}
              </div>
              <div>
                <div className="label">{t('repository.fieldUrl')}</div>
                <div className="text-sm break-all bg-bg-elev border border-line rounded-lg p-3 text-ink-dim">{selected.url}</div>
              </div>
              <div>
                <div className="label">{t('repository.added')}</div>
                <div className="text-sm text-ink-dim">{formatDate(selected.createdAt)}</div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-line flex justify-between gap-2 bg-bg-elev/40">
              <button
                className="btn-ghost"
                onClick={() => { setEditing({ id: selected.id, title: selected.title, url: selected.url, subjectId: selected.subjectId }); setSelected(null); }}
              >
                <Pencil className="w-4 h-4" /> {t('common.edit')}
              </button>
              <a
                className="btn-primary"
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" /> {t('repository.openTab')}
              </a>
            </div>
          </aside>
        </div>
      )}

      {/* Form modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? t('repository.formEdit') : t('repository.formNew')}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
            <button className="btn-primary" onClick={save}>{t('common.save')}</button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="label">{t('repository.fieldTitle')}</label>
              <input
                className="input"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder={t('repository.titlePh')}
                autoFocus
              />
            </div>
            <div>
              <label className="label">{t('repository.fieldUrl')}</label>
              <input
                className="input"
                value={editing.url}
                onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                placeholder={t('repository.urlPh')}
              />
            </div>
            <div>
              <label className="label">{t('repository.fieldSubject')}</label>
              <select
                className="input"
                value={editing.subjectId ?? ''}
                onChange={(e) => setEditing({ ...editing, subjectId: e.target.value || null })}
              >
                <option value="">{t('repository.general')}</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
