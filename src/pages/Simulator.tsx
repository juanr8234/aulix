import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
  addEdge,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Eye, Pencil, RotateCcw, X, Circle, Clock } from 'lucide-react';
import Modal from '../components/Modal';
import { useStore } from '../store';
import { hexToRgba } from '../lib/utils';
import { useT } from '../lib/i18n';
import {
  deriveStatus,
  getApprovedReqs,
  getRegularReqs,
  getMissingReqs,
  DERIVED_COLOR,
} from '../lib/simulator';
import type { Subject, DerivedStatus } from '../types';

const COL_W = 240;
const ROW_H = 110;
const X_GAP = 80;
const Y_GAP = 24;

interface NodeData {
  subject: Subject;
  derived: DerivedStatus;
  highlight: 'none' | 'selected' | 'prereq' | 'unlocks';
  onSelect: (id: string) => void;
  onCycle: (id: string) => void;
}

function SubjectNode({ data }: NodeProps<NodeData>) {
  const t = useT();
  const { subject, derived, highlight, onSelect, onCycle } = data;
  const color = DERIVED_COLOR[derived];
  const ring =
    highlight === 'selected' ? 'ring-2 ring-white/70'
    : highlight === 'prereq' ? 'ring-2 ring-amber-300'
    : highlight === 'unlocks' ? 'ring-2 ring-emerald-300'
    : '';

  return (
    <div
      onClick={() => onSelect(subject.id)}
      onDoubleClick={(e) => { e.stopPropagation(); onCycle(subject.id); }}
      className={`bg-bg-card border border-line rounded-xl shadow-soft cursor-pointer hover:border-brand/60 transition ${ring}`}
      style={{ width: COL_W, borderLeft: `4px solid ${color}` }}
      title={t('simulator.nodeTitle')}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, opacity: 0 }} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold leading-tight">{subject.name}</div>
          <div
            className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
            style={{ background: color }}
            title={t('simulator.derived.' + derived)}
          />
        </div>
        {subject.code && <div className="text-[11px] text-ink-mute mt-0.5">{subject.code}</div>}
        <div className="mt-2 flex items-center gap-2">
          <span
            className="chip"
            style={{ background: hexToRgba(color, 0.18), color }}
          >
            {t('simulator.derived.' + derived)}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color, opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { subject: SubjectNode };

/**
 * Cicla el estado de una materia: pending → regular → approved → pending.
 * (Salteamos 'ongoing' acá porque en el simulador interesa el resultado,
 * no si la está cursando ahora; eso lo edita en la pantalla Materias.)
 */
function nextStatus(s: Subject['status']): Subject['status'] {
  switch (s) {
    case 'pending':
      return 'ongoing';
    case 'ongoing':
      return 'regular';
    case 'regular':
      return 'approved';
    case 'approved':
      return 'pending';
  }
}

export default function Simulator() {
  const t = useT();
  const subjects = useStore((s) => s.subjects);
  const updateSubject = useStore((s) => s.updateSubject);

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [warningSubj, setWarningSubj] = useState<{ subject: Subject; missing: { approved: Subject[]; regular: Subject[] } } | null>(null);

  const subjectMap = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s])) as Record<string, Subject>,
    [subjects],
  );

  const handleStatusChange = useCallback((id: string, newStatus: Subject['status']) => {
    const s = subjectMap[id];
    if (!s) return;
    if (newStatus === 'ongoing') {
      const missing = getMissingReqs(s, subjectMap);
      if (missing.approved.length > 0 || missing.regular.length > 0) {
        setWarningSubj({ subject: s, missing });
      }
    }
    updateSubject(id, { status: newStatus });
  }, [subjectMap, updateSubject]);

  // Estado derivado por materia
  const derivedMap = useMemo(() => {
    const map: Record<string, DerivedStatus> = {};
    for (const s of subjects) map[s.id] = deriveStatus(s, subjectMap);
    return map;
  }, [subjects, subjectMap]);

  // Layout: columnas por nivel (year)
  const layout = useMemo(() => {
    const byYear: Record<number, Subject[]> = {};
    subjects.forEach((s) => {
      const y = s.year ?? 1;
      (byYear[y] ??= []).push(s);
    });
    const positions: Record<string, { x: number; y: number }> = {};
    Object.keys(byYear)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((y) => {
        byYear[y].forEach((s, i) => {
          positions[s.id] = { x: (y - 1) * (COL_W + X_GAP), y: i * (ROW_H + Y_GAP) };
        });
      });
    return positions;
  }, [subjects]);

  // Highlight de prereqs / unlocks al seleccionar
  const highlightMap = useMemo(() => {
    const map: Record<string, NodeData['highlight']> = {};
    if (!selectedId || !subjectMap[selectedId]) return map;
    map[selectedId] = 'selected';

    const allReqs = (s: Subject) => [...getApprovedReqs(s), ...getRegularReqs(s)];

    // prereqs (recursivo hacia atrás)
    const visitedPre = new Set<string>();
    const stack = [...allReqs(subjectMap[selectedId])];
    while (stack.length) {
      const id = stack.pop()!;
      if (visitedPre.has(id) || !subjectMap[id]) continue;
      visitedPre.add(id);
      if (!map[id]) map[id] = 'prereq';
      allReqs(subjectMap[id]).forEach((c) => stack.push(c));
    }

    // unlocks (recursivo hacia adelante)
    const visitedPost = new Set<string>();
    const queue = [selectedId];
    while (queue.length) {
      const id = queue.shift()!;
      subjects.forEach((s) => {
        if (allReqs(s).includes(id) && !visitedPost.has(s.id)) {
          visitedPost.add(s.id);
          if (!map[s.id]) map[s.id] = 'unlocks';
          queue.push(s.id);
        }
      });
    }
    return map;
  }, [selectedId, subjects, subjectMap]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleCycle = useCallback((id: string) => {
    const s = subjectMap[id];
    if (!s) return;
    handleStatusChange(id, nextStatus(s.status));
  }, [subjectMap, handleStatusChange]);

  const initialNodes: Node<NodeData>[] = useMemo(
    () =>
      subjects.map((s) => ({
        id: s.id,
        type: 'subject',
        position: layout[s.id] ?? { x: 0, y: 0 },
        data: {
          subject: s,
          derived: derivedMap[s.id] ?? 'locked',
          highlight: highlightMap[s.id] ?? 'none',
          onSelect: handleSelect,
          onCycle: handleCycle,
        },
        draggable: mode === 'edit',
        connectable: mode === 'edit',
      })),
    [subjects, layout, derivedMap, highlightMap, mode, handleSelect, handleCycle],
  );

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    subjects.forEach((s) => {
      // Aristas de "aprobada" — más visibles
      getApprovedReqs(s).forEach((preId) => {
        if (!subjectMap[preId]) return;
        edges.push({
          id: `app:${preId}->${s.id}`,
          source: preId,
          target: s.id,
          type: 'smoothstep',
          style: { stroke: '#22c55e', strokeWidth: 1.5, opacity: 0.55 },
        });
      });
      // Aristas de "regular" — punteadas
      getRegularReqs(s).forEach((preId) => {
        if (!subjectMap[preId]) return;
        edges.push({
          id: `reg:${preId}->${s.id}`,
          source: preId,
          target: s.id,
          type: 'smoothstep',
          style: { stroke: '#f59e0b', strokeWidth: 1.2, opacity: 0.5, strokeDasharray: '4 3' },
        });
      });
    });
    return edges;
  }, [subjects, subjectMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Re-sync cuando cambian inputs (uso useEffect, no useMemo, porque es un efecto)
  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (conn: Connection) => {
      if (mode !== 'edit' || !conn.source || !conn.target || conn.source === conn.target) return;
      const target = subjectMap[conn.target];
      if (!target) return;
      // En modo edición, conectar agrega como correlativa "aprobada" por defecto
      const next = Array.from(new Set([...getApprovedReqs(target), conn.source]));
      updateSubject(target.id, { correlativesApproved: next });
      setEdges((eds) =>
        addEdge(
          { ...conn, type: 'smoothstep', style: { stroke: '#22c55e', strokeWidth: 1.5, opacity: 0.55 } },
          eds,
        ),
      );
    },
    [mode, subjectMap, updateSubject, setEdges],
  );

  // Progreso global
  const progress = useMemo(() => {
    const total = subjects.length;
    if (total === 0) return { pct: 0, approved: 0, total: 0, available: 0, regular: 0 };
    let approved = 0, regular = 0, available = 0;
    for (const s of subjects) {
      const d = derivedMap[s.id];
      if (d === 'approved') approved++;
      else if (d === 'regular') regular++;
      else if (d === 'available') available++;
    }
    return { pct: Math.round((approved / total) * 100), approved, total, available, regular };
  }, [subjects, derivedMap]);

  // Reset: todas a pending
  const resetAll = () => {
    if (!confirm(t('simulator.resetConfirm'))) return;
    subjects.forEach((s) => {
      if (s.status !== 'pending') updateSubject(s.id, { status: 'pending' });
    });
  };

  if (subjects.length === 0) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-2">{t('simulator.emptyTitle')}</h1>
        <div className="card p-12 text-center text-ink-dim mt-6">
          {t('simulator.emptyBody')}
        </div>
      </div>
    );
  }

  const selected = selectedId ? subjectMap[selectedId] : null;

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-4 border-b border-line bg-bg-elev/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t('simulator.title')}</h1>
          <p className="text-xs text-ink-dim mt-0.5">
            {t('simulator.subtitleClick')}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="text-xs text-ink-dim whitespace-nowrap">
              {t('simulator.approvedOf', { a: progress.approved, t: progress.total })}
            </div>
            <div className="w-40 h-2 rounded-full bg-bg-soft overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress.pct}%` }} />
            </div>
            <div className="text-xs font-semibold text-emerald-400">{progress.pct}%</div>
          </div>

          <div className="bg-bg-elev border border-line rounded-full p-1 flex items-center">
            <button
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                mode === 'view' ? 'bg-brand text-white' : 'text-ink-dim hover:text-ink'
              }`}
              onClick={() => setMode('view')}
            >
              <Eye className="w-3.5 h-3.5" /> {t('simulator.modeView')}
            </button>
            <button
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                mode === 'edit' ? 'bg-brand text-white' : 'text-ink-dim hover:text-ink'
              }`}
              onClick={() => setMode('edit')}
            >
              <Pencil className="w-3.5 h-3.5" /> {t('simulator.modeEdit')}
            </button>
          </div>

          <button className="btn-ghost text-xs" onClick={resetAll} title={t('simulator.resetTitle')}>
            <RotateCcw className="w-3.5 h-3.5" /> {t('simulator.reset')}
          </button>
        </div>
      </div>

      {/* Canvas + panel lateral */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={mode === 'edit'}
            nodesConnectable={mode === 'edit'}
            elementsSelectable
          >
            <Background gap={24} size={1} color="rgb(var(--line))" />
            <Controls className="!bg-bg-card !border-line" showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) => DERIVED_COLOR[(n.data as NodeData)?.derived ?? 'locked']}
              maskColor="rgb(var(--bg) / 0.8)"
              style={{ background: 'rgb(var(--bg-card))', border: '1px solid rgb(var(--line))' }}
            />
          </ReactFlow>
        </div>

        {/* Panel detalle */}
        {selected && (
          <SubjectDetail
            subject={selected}
            derived={derivedMap[selected.id] ?? 'locked'}
            byId={subjectMap}
            onClose={() => setSelectedId(null)}
            onChangeStatus={(status) => handleStatusChange(selected.id, status)}
          />
        )}
      </div>

      {/* Footer leyenda */}
      <div className="px-6 py-2 border-t border-line bg-bg-elev/40 text-[11px] text-ink-mute flex flex-wrap gap-4 items-center">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: DERIVED_COLOR.available }} /> {t('simulator.legendAvailable')}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: DERIVED_COLOR.ongoing }} /> {t('simulator.legendOngoing')}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: DERIVED_COLOR.regular }} /> {t('simulator.legendRegular')}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: DERIVED_COLOR.approved }} /> {t('simulator.legendApproved')}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: DERIVED_COLOR.locked }} /> {t('simulator.legendLocked')}</span>
        <span className="flex items-center gap-1.5 ml-4"><span className="inline-block w-6 h-px bg-emerald-500" /> {t('simulator.edgeApproved')}</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 border-t border-dashed border-amber-400" /> {t('simulator.edgeRegular')}</span>
        {mode === 'edit' && <span className="ml-auto text-amber-400">{t('simulator.editHint')}</span>}
      </div>

      {/* Modal de Advertencia de Correlativas */}
      {warningSubj && (
        <Modal
          open
          onClose={() => setWarningSubj(null)}
          title="Advertencia: Correlativas pendientes"
          footer={
            <button className="btn-primary" onClick={() => setWarningSubj(null)}>
              Entendido
            </button>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-ink-dim">
              Estás marcando <strong>{warningSubj.subject.name}</strong> como <strong>Cursando</strong>, pero aún no cumples con los siguientes requisitos del plan de estudios:
            </p>
            <div className="card p-4 bg-red-500/5 border border-red-500/20 space-y-3">
              {warningSubj.missing.approved.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-red-300 font-semibold mb-1">
                    Debe estar aprobada:
                  </div>
                  <ul className="list-disc pl-5 text-xs space-y-1 text-ink">
                    {warningSubj.missing.approved.map((s) => (
                      <li key={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
              {warningSubj.missing.regular.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-amber-300 font-semibold mb-1">
                    Debe estar regularizada:
                  </div>
                  <ul className="list-disc pl-5 text-xs space-y-1 text-ink">
                    {warningSubj.missing.regular.map((s) => (
                      <li key={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─────────────── Panel lateral ─────────────── */

function SubjectDetail({
  subject,
  derived,
  byId,
  onClose,
  onChangeStatus,
}: {
  subject: Subject;
  derived: DerivedStatus;
  byId: Record<string, Subject>;
  onClose: () => void;
  onChangeStatus: (s: Subject['status']) => void;
}) {
  const t = useT();
  const missing = getMissingReqs(subject, byId);
  const approvedReqs = getApprovedReqs(subject).map((id) => byId[id]).filter(Boolean);
  const regularReqs = getRegularReqs(subject).map((id) => byId[id]).filter(Boolean);

  const color = DERIVED_COLOR[derived];

  const isOk = (s: Subject, kind: 'approved' | 'regular') => {
    if (kind === 'approved') return s.status === 'approved';
    return s.status === 'regular' || s.status === 'approved';
  };

  return (
    <aside className="w-[340px] shrink-0 border-l border-line bg-bg-elev/40 overflow-y-auto">
      <div className="p-4 border-b border-line flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-ink-mute">{subject.code} · {t('simulator.level')} {subject.year ?? '—'}</div>
          <div className="text-base font-semibold leading-tight mt-0.5">{subject.name}</div>
          <span
            className="chip mt-2"
            style={{ background: hexToRgba(color, 0.18), color }}
          >
            {t('simulator.derived.' + derived)}
          </span>
        </div>
        <button onClick={onClose} className="btn-ghost p-1.5" title={t('common.close')}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 border-b border-line">
        <div className="text-[11px] uppercase tracking-wide text-ink-mute mb-2">{t('simulator.changeStatus')}</div>
        <div className="grid grid-cols-2 gap-1.5">
          {(['pending', 'ongoing', 'regular', 'approved'] as const).map((opt) => {
            const active = subject.status === opt;
            const labels = {
              pending: t('simulator.stPending'),
              ongoing: t('simulator.stOngoing'),
              regular: t('simulator.stRegular'),
              approved: t('simulator.stApproved')
            };
            return (
              <button
                key={opt}
                onClick={() => onChangeStatus(opt)}
                className={`text-xs font-semibold rounded-md px-2 py-1.5 border transition ${
                  active ? 'border-brand text-white bg-brand/20' : 'border-line text-ink-dim hover:text-ink hover:border-ink-mute'
                }`}
              >
                {labels[opt]}
              </button>
            );
          })}
        </div>
      </div>

      {derived === 'locked' && (missing.approved.length > 0 || missing.regular.length > 0) && (
        <div className="p-4 border-b border-line">
          <div className="text-[11px] uppercase tracking-wide text-ink-mute mb-2">{t('simulator.missing')}</div>
          <ul className="space-y-1.5">
            {missing.approved.map((s) => (
              <li key={`mA-${s.id}`} className="text-xs flex items-center gap-2">
                <Circle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="flex-1">{s.name}</span>
                <span className="text-[10px] text-emerald-400 font-semibold">{t('simulator.reqApproved')}</span>
              </li>
            ))}
            {missing.regular.map((s) => (
              <li key={`mR-${s.id}`} className="text-xs flex items-center gap-2">
                <Circle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="flex-1">{s.name}</span>
                <span className="text-[10px] text-amber-400 font-semibold">{t('simulator.reqRegular')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Requisitos para Cursar y Rendir Final */}
      {(approvedReqs.length > 0 || regularReqs.length > 0) && (
        <div className="p-4 border-b border-line space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink-mute mb-2">Para Cursar</div>
            <ul className="space-y-1.5">
              {approvedReqs.map((s) => {
                const met = isOk(s, 'approved');
                return (
                  <li key={`curs-app-${s.id}`} className="text-xs flex items-center justify-between gap-2">
                    <span className={met ? 'text-ink' : 'text-ink-dim truncate flex-1'}>{s.name}</span>
                    <span className={`chip text-[10px] py-0.5 px-2 font-semibold shrink-0 ${met ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
                      {met ? 'Aprobada' : 'Falta Aprobada'}
                    </span>
                  </li>
                );
              })}
              {regularReqs.map((s) => {
                const met = isOk(s, 'regular');
                return (
                  <li key={`curs-reg-${s.id}`} className="text-xs flex items-center justify-between gap-2">
                    <span className={met ? 'text-ink' : 'text-ink-dim truncate flex-1'}>{s.name}</span>
                    <span className={`chip text-[10px] py-0.5 px-2 font-semibold shrink-0 ${met ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
                      {met ? 'Regular' : 'Falta Regular'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="pt-3 border-t border-line/45">
            <div className="text-[11px] uppercase tracking-wide text-ink-mute mb-2">Para Rendir Final</div>
            <ul className="space-y-1.5">
              {[...approvedReqs, ...regularReqs].map((s) => {
                const met = isOk(s, 'approved');
                return (
                  <li key={`fin-app-${s.id}`} className="text-xs flex items-center justify-between gap-2">
                    <span className={met ? 'text-ink' : 'text-ink-dim truncate flex-1'}>{s.name}</span>
                    <span className={`chip text-[10px] py-0.5 px-2 font-semibold shrink-0 ${met ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
                      {met ? 'Aprobada' : 'Falta Aprobada'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {approvedReqs.length === 0 && regularReqs.length === 0 && (
        <div className="p-4 border-b border-line text-xs text-ink-mute flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          {t('simulator.noCorrelatives')}
        </div>
      )}
    </aside>
  );
}
