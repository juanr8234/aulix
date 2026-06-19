import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Search, Save, ImagePlus } from 'lucide-react';
import { useStore } from '../store';
import { useT } from '../lib/i18n';
import SubjectChip from '../components/SubjectChip';

/**
 * Convierte un archivo de imagen en un data URL comprimido (reescala si es grande)
 * para poder incrustarlo en la nota sin inflar el archivo de datos local.
 */
async function compressImage(file: File, maxDim = 1400, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = dataUrl;
    });
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, width, height);
    // PNG conserva nitidez de texto en screenshots; si pesa mucho, cae a JPEG.
    const png = canvas.toDataURL('image/png');
    const jpg = canvas.toDataURL('image/jpeg', quality);
    return png.length < jpg.length ? png : jpg;
  } catch {
    return dataUrl;
  }
}

export default function Notes() {
  const t = useT();
  const notes = useStore((s) => s.notes);
  const subjects = useStore((s) => s.subjects);
  const addNote = useStore((s) => s.addNote);
  const updateNote = useStore((s) => s.updateNote);
  const removeNote = useStore((s) => s.removeNote);

  const [activeId, setActiveId] = useState<string | null>(() => {
    const saved = sessionStorage.getItem('aulix:activeNote');
    if (saved && notes.some((n) => n.id === saved)) return saved;
    return notes[0]?.id ?? null;
  });
  const [q, setQ] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Persistir la nota activa para que se reabra al volver a la sección.
  useEffect(() => {
    if (activeId) sessionStorage.setItem('aulix:activeNote', activeId);
  }, [activeId]);

  // Atajos: Ctrl/Cmd+N crea nota · "/" enfoca la búsqueda.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      const typing = tgt.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tgt.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveId(addNote({ title: t('notes.newNote'), contentHtml: '' }));
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addNote, t]);

  const filtered = useMemo(
    () => notes.filter((n) => !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.contentHtml.toLowerCase().includes(q.toLowerCase())),
    [notes, q],
  );

  const active = notes.find((n) => n.id === activeId) ?? null;

  useEffect(() => {
    if (!active && notes.length) setActiveId(notes[0].id);
  }, [active, notes]);

  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active && editorRef.current && editorRef.current.innerHTML !== active.contentHtml) {
      editorRef.current.innerHTML = active.contentHtml;
    }
    // Enfocar el editor al abrir/crear una nota, para poder escribir sin clickear.
    if (active && editorRef.current) editorRef.current.focus();
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedUpdate = (patch: Partial<Parameters<typeof updateNote>[1]>) => {
    if (!active) return;
    if (bodyTimer.current) clearTimeout(bodyTimer.current);
    bodyTimer.current = setTimeout(() => {
      updateNote(active.id, patch);
      setSavedAt(Date.now());
    }, 350);
  };

  const onTitle = (v: string) => {
    if (!active) return;
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      updateNote(active.id, { title: v });
      setSavedAt(Date.now());
    }, 250);
  };

  // Inserta una imagen (comprimida) en la posición del cursor del editor.
  const insertImage = async (file: File) => {
    if (!active || !file.type.startsWith('image/')) return;
    const url = await compressImage(file);
    editorRef.current?.focus();
    document.execCommand('insertImage', false, url);
    if (editorRef.current) debouncedUpdate({ contentHtml: editorRef.current.innerHTML });
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        e.preventDefault();
        const file = it.getAsFile();
        if (file) insertImage(file);
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    const imgs = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
    if (imgs.length) {
      e.preventDefault();
      imgs.forEach(insertImage);
    }
  };

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current && active) debouncedUpdate({ contentHtml: editorRef.current.innerHTML });
  };

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-line flex flex-col bg-bg-elev/30">
        <div className="p-3 border-b border-line space-y-2">
          <button
            className="btn-primary w-full justify-center"
            onClick={() => {
              const id = addNote({ title: t('notes.newNote'), contentHtml: '' });
              setActiveId(id);
            }}
          >
            <Plus className="w-4 h-4" /> {t('notes.newNote')}
          </button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
            <input ref={searchRef} className="input pl-9" placeholder={t('notes.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 && <div className="p-6 text-center text-sm text-ink-dim">{t('notes.empty')}</div>}
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveId(n.id)}
              className={`w-full text-left p-3 rounded-lg border transition ${
                activeId === n.id ? 'bg-brand/15 border-brand/40' : 'border-transparent hover:bg-bg-soft'
              }`}
            >
              <div className="font-medium text-sm truncate">{n.title || t('notes.untitled')}</div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <SubjectChip subjectId={n.subjectId} />
                <span className="text-[10px] text-ink-mute">
                  {new Date(n.updatedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!active ? (
          <div className="flex-1 grid place-items-center text-ink-dim text-sm">{t('notes.selectOrCreate')}</div>
        ) : (
          <>
            <div className="border-b border-line px-6 py-4 space-y-3">
              <input
                className="bg-transparent w-full text-2xl font-bold focus:outline-none placeholder:text-ink-mute"
                placeholder={t('notes.titlePh')}
                defaultValue={active.title}
                onChange={(e) => onTitle(e.target.value)}
                key={active.id + '-title'}
              />
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="input !w-auto !py-1.5"
                  value={active.subjectId ?? ''}
                  onChange={(e) => updateNote(active.id, { subjectId: e.target.value || null })}
                >
                  <option value="">{t('notes.noSubject')}</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 border-l border-line pl-2 ml-1">
                  <ToolBtn onClick={() => exec('bold')} icon={<Bold className="w-4 h-4" />} />
                  <ToolBtn onClick={() => exec('italic')} icon={<Italic className="w-4 h-4" />} />
                  <ToolBtn onClick={() => exec('formatBlock', 'H1')} icon={<Heading1 className="w-4 h-4" />} />
                  <ToolBtn onClick={() => exec('formatBlock', 'H2')} icon={<Heading2 className="w-4 h-4" />} />
                  <ToolBtn onClick={() => exec('insertUnorderedList')} icon={<List className="w-4 h-4" />} />
                  <ToolBtn onClick={() => exec('insertOrderedList')} icon={<ListOrdered className="w-4 h-4" />} />
                  <ToolBtn onClick={() => exec('formatBlock', 'BLOCKQUOTE')} icon={<Quote className="w-4 h-4" />} />
                  <ToolBtn onClick={() => imageInputRef.current?.click()} icon={<ImagePlus className="w-4 h-4" />} />
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    Array.from(e.target.files ?? []).forEach(insertImage);
                    e.target.value = '';
                  }}
                />
                <div className="ml-auto flex items-center gap-3 text-xs text-ink-mute">
                  {savedAt && (
                    <span className="flex items-center gap-1">
                      <Save className="w-3 h-3" /> {t('notes.saved', { time: new Date(savedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) })}
                    </span>
                  )}
                  <button
                    className="btn-ghost !p-1.5 hover:!text-red-400"
                    onClick={() => {
                      if (confirm(t('notes.confirmDelete'))) {
                        removeNote(active.id);
                        setActiveId(null);
                      }
                    }}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={editorRef}
              className="note-editor flex-1 overflow-y-auto px-8 py-6 leading-relaxed text-ink"
              contentEditable
              suppressContentEditableWarning
              data-placeholder={t('notes.editorPlaceholder')}
              onInput={(e) => debouncedUpdate({ contentHtml: (e.target as HTMLDivElement).innerHTML })}
              onPaste={onPaste}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              key={active.id + '-body'}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ToolBtn({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="p-1.5 rounded text-ink-dim hover:text-ink hover:bg-bg-soft transition"
    >
      {icon}
    </button>
  );
}
