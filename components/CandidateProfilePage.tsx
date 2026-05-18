'use client';

import { CandidateType } from '@/utils/types';
import { useState, useTransition } from 'react';
import {
  User, MapPin, Briefcase, GraduationCap, Mail, Phone, FileText,
  Star, MessageSquare, Calendar, ChevronRight, Pencil, Trash2,
  Clock, Video, Phone as PhoneIcon, Building2, ClipboardCheck,
  CheckCircle2, XCircle, AlertCircle, RotateCcw, Plus, ArrowLeft, ExternalLink,
  Sparkles, Tag
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn, getScoreColor, getScoreLabel } from '@/lib/utils';
import {
  getCandidateNotesAction, createCandidateNoteAction, deleteCandidateNoteAction,
  getCandidateInterviewsAction, createInterviewAction, updateInterviewOutcomeAction, deleteInterviewAction,
  updateCandidateAction,
} from '@/utils/actions';
import { useToast } from './ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CandidateStatus } from '@/utils/types';

// ─── Status colours ────────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  'In cerca':    'bg-blue-500/15 text-blue-600 border-blue-200',
  'Colloquiato': 'bg-amber-500/15 text-amber-600 border-amber-200',
  'Inserito':    'bg-green-500/15 text-green-600 border-green-200',
  'Non idoneo':  'bg-red-500/15 text-red-600 border-red-200',
};

const noteTypeColor: Record<string, string> = {
  NOTA:       'bg-primary/10 text-primary',
  VALUTAZIONE:'bg-amber-500/15 text-amber-600',
  COLLOQUIO:  'bg-purple-500/15 text-purple-600',
  FEEDBACK:   'bg-green-500/15 text-green-600',
};

const outcomeColor: Record<string, string> = {
  PENDING:     'bg-amber-500/15 text-amber-600',
  PASSED:      'bg-green-500/15 text-green-600',
  FAILED:      'bg-red-500/15 text-red-600',
  NO_SHOW:     'bg-gray-500/15 text-gray-500',
  RESCHEDULED: 'bg-blue-500/15 text-blue-600',
};

const interviewTypeIcon: Record<string, React.ReactNode> = {
  PHONE:      <PhoneIcon className="w-4 h-4" />,
  VIDEO:      <Video className="w-4 h-4" />,
  IN_PERSON:  <Building2 className="w-4 h-4" />,
  ASSESSMENT: <ClipboardCheck className="w-4 h-4" />,
};

// ─── Component ─────────────────────────────────────────────────────────────
export default function CandidateProfilePage({ candidate }: { candidate: CandidateType }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'notes' | 'interviews' | 'edit'>('overview');
  const [isPending, startTransition] = useTransition();

  // Note state
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<'NOTA' | 'VALUTAZIONE' | 'COLLOQUIO' | 'FEEDBACK'>('NOTA');

  // Interview state
  const [itvType, setItvType] = useState<'PHONE' | 'VIDEO' | 'IN_PERSON' | 'ASSESSMENT'>('VIDEO');
  const [itvDate, setItvDate] = useState('');
  const [itvDuration, setItvDuration] = useState('60');
  const [itvLocation, setItvLocation] = useState('');
  const [itvNotes, setItvNotes] = useState('');

  // Edit state
  const [editStatus, setEditStatus] = useState(candidate.status);
  const [editNotes, setEditNotes] = useState(candidate.notes ?? '');

  // Queries
  const { data: notes = [] } = useQuery({
    queryKey: ['candidate-notes', candidate.id],
    queryFn: () => getCandidateNotesAction(candidate.id),
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ['candidate-interviews', candidate.id],
    queryFn: () => getCandidateInterviewsAction(candidate.id),
  });

  // Mutations
  const addNote = useMutation({
    mutationFn: () => createCandidateNoteAction({ candidateId: candidate.id, type: noteType, content: noteContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-notes', candidate.id] });
      setNoteContent('');
      toast({ description: 'Nota aggiunta.' });
    },
  });

  const deleteNote = useMutation({
    mutationFn: (noteId: string) => deleteCandidateNoteAction(noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidate-notes', candidate.id] }),
  });

  const addInterview = useMutation({
    mutationFn: () => createInterviewAction({
      candidateId: candidate.id,
      type: itvType,
      scheduledAt: itvDate,
      duration: parseInt(itvDuration) || undefined,
      location: itvLocation || undefined,
      notes: itvNotes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-interviews', candidate.id] });
      setItvDate(''); setItvLocation(''); setItvNotes('');
      toast({ description: 'Colloquio pianificato.' });
    },
  });

  const updateOutcome = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: string }) =>
      updateInterviewOutcomeAction(id, outcome as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidate-interviews', candidate.id] }),
  });

  const deleteInterview = useMutation({
    mutationFn: (id: string) => deleteInterviewAction(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidate-interviews', candidate.id] }),
  });

  const saveEdit = () => {
    startTransition(async () => {
      const res = await updateCandidateAction(candidate.id, { status: editStatus as any, notes: editNotes });
      if (res) {
        queryClient.invalidateQueries({ queryKey: ['candidates'] });
        toast({ description: 'Candidato aggiornato.' });
      }
    });
  };

  const skills = candidate.skills?.split(',').map(s => s.trim()).filter(Boolean) ?? [];

  const tabs = [
    { id: 'overview',     label: 'Profilo',    icon: <User className="w-4 h-4" /> },
    { id: 'applications', label: `Candidature (${candidate.applications?.length || 0})`, icon: <Briefcase className="w-4 h-4" /> },
    { id: 'notes',        label: `Note (${notes.length})`, icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'interviews',   label: `Colloqui (${interviews.length})`, icon: <Calendar className="w-4 h-4" /> },
    { id: 'edit',         label: 'Modifica',   icon: <Pencil className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link href="/jobs" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Archivio
        </Link>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
        <span className="text-sm font-medium">{candidate.firstName} {candidate.lastName}</span>
      </div>

      {/* Hero card */}
      <div className="glass rounded-3xl p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/20 shrink-0">
          {candidate.firstName[0]}{candidate.lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{candidate.firstName} {candidate.lastName}</h1>
            <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold border', statusColor[candidate.status] ?? 'bg-gray-100 text-gray-600')}>
              {candidate.status}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 font-medium">{candidate.role} · {candidate.seniority}</p>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{candidate.city}{candidate.province && ` (${candidate.province.toUpperCase()})`}</span>
            <a href={`mailto:${candidate.email}`} className="flex items-center gap-1 hover:text-primary transition-colors"><Mail className="w-3.5 h-3.5" />{candidate.email}</a>
            {candidate.phone && <a href={`tel:${candidate.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors"><Phone className="w-3.5 h-3.5" />{candidate.phone}</a>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {candidate.cvUrl && (
            <a href={candidate.cvUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                <FileText className="w-4 h-4" /> CV
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass rounded-3xl p-6 space-y-4">
            <h2 className="font-semibold text-primary flex items-center gap-2"><Briefcase className="w-4 h-4" />Profilo Professionale</h2>
            <InfoRow label="Settore" value={candidate.sector} />
            <InfoRow label="Seniority" value={candidate.seniority} />
            {candidate.education && <InfoRow label="Titolo di Studio" value={candidate.education} />}
            {candidate.expectedSalary && <InfoRow label="RAL Attesa" value={`€ ${candidate.expectedSalary.toLocaleString('it-IT')}`} />}
            <InfoRow label="Aggiunto il" value={new Date(candidate.createdAt).toLocaleDateString('it-IT')} />
          </div>

          {candidate.matchingScore !== null && candidate.matchingScore !== undefined && (
            <div className="glass rounded-3xl p-6 space-y-4">
              <h2 className="font-semibold text-primary flex items-center gap-2"><Sparkles className="w-4 h-4" />AI Match Score</h2>
              <div className="flex items-center gap-4">
                <span className={cn("text-4xl font-black px-4 py-2 rounded-2xl border", getScoreColor(candidate.matchingScore))}>
                  {candidate.matchingScore}%
                </span>
                <div>
                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-lg border", getScoreColor(candidate.matchingScore))}>
                    {getScoreLabel(candidate.matchingScore)}
                  </span>
                  {candidate.recommendation && (
                    <p className="text-sm text-muted-foreground mt-2 italic">&ldquo;{candidate.recommendation}&rdquo;</p>
                  )}
                </div>
              </div>
              {candidate.matchedKeywords && candidate.matchedKeywords.length > 0 && (
                <div className="pt-3 border-t border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Competenze Riconosciute</p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.matchedKeywords.map((kw, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-200/50 dark:border-emerald-800/50">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {candidate.missingKeywords && candidate.missingKeywords.length > 0 && (
                <div className="pt-3 border-t border-border/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Competenze Mancanti</p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.missingKeywords.map((kw, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 font-medium border border-red-200/50 dark:border-red-800/50">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="glass rounded-3xl p-6 space-y-4">
            <h2 className="font-semibold text-primary flex items-center gap-2"><Tag className="w-4 h-4" />Competenze</h2>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map(s => (
                  <span key={s} className="text-xs px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-medium border border-primary/10">{s}</span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nessuna competenza inserita</p>
            )}
          </div>

          {candidate.notes && (
            <div className="md:col-span-2 glass rounded-3xl p-6 space-y-2">
              <h2 className="font-semibold text-primary flex items-center gap-2"><Sparkles className="w-4 h-4" />Note Recruiter</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{candidate.notes}</p>
            </div>
          )}
        </div>
      )}
      {/* ── APPLICATIONS TAB ─────────────────────────────── */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="glass rounded-3xl p-6 space-y-6">
            <h2 className="font-semibold text-primary flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Posizioni per cui si è candidato
            </h2>
            
            {(!candidate.applications || candidate.applications.length === 0) ? (
              <div className="text-center py-12 space-y-3">
                <Briefcase className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                <p className="text-muted-foreground">Nessuna candidatura registrata per questo candidato.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {candidate.applications.map((app: any) => (
                  <div key={app.id} className="p-4 rounded-2xl border border-border/50 bg-background/30 flex items-center justify-between group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold">{app.job?.title || 'Job non trovato'}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{app.job?.company}</span>
                          <span>•</span>
                          <span>Inviata il {new Date(app.createdAt).toLocaleDateString('it-IT')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                        app.status === "Nuovo" ? "bg-blue-500/15 text-blue-600" : "bg-muted text-muted-foreground"
                      )}>
                        {app.status}
                      </span>
                      <Link 
                        href={`/positions/${app.jobId}`}
                        className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NOTES TAB ────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Add note form */}
          <div className="glass rounded-3xl p-6 space-y-4">
            <h2 className="font-semibold text-primary">Aggiungi Nota</h2>
            <div className="flex gap-2">
              {(['NOTA','VALUTAZIONE','COLLOQUIO','FEEDBACK'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setNoteType(t)}
                  className={cn('text-xs px-3 py-1.5 rounded-xl font-medium border transition-all', noteType === t ? noteTypeColor[t] + ' border-current/20' : 'text-muted-foreground border-border hover:bg-primary/5')}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              className="w-full min-h-[100px] rounded-2xl border border-border bg-background/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Scrivi una nota…"
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
            />
            <Button
              onClick={() => addNote.mutate()}
              disabled={!noteContent.trim() || addNote.isPending}
              className="rounded-xl gap-2"
            >
              <Plus className="w-4 h-4" /> {addNote.isPending ? 'Salvataggio…' : 'Aggiungi Nota'}
            </Button>
          </div>

          {/* Notes list */}
          <div className="space-y-3">
            {notes.length === 0 && (
              <div className="glass rounded-3xl p-8 text-center text-muted-foreground text-sm">
                Nessuna nota. Aggiungi la prima nota sopra.
              </div>
            )}
            {notes.map((note: any) => (
              <div key={note.id} className="glass rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-lg font-semibold', noteTypeColor[note.type])}>{note.type}</span>
                    <span className="text-xs text-muted-foreground font-medium">{note.authorName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleDateString('it-IT')}</span>
                    <button onClick={() => deleteNote.mutate(note.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── INTERVIEWS TAB ───────────────────────────────── */}
      {activeTab === 'interviews' && (
        <div className="space-y-4">
          {/* Schedule form */}
          <div className="glass rounded-3xl p-6 space-y-4">
            <h2 className="font-semibold text-primary">Pianifica Colloquio</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</label>
                <div className="flex gap-2 flex-wrap">
                  {(['PHONE','VIDEO','IN_PERSON','ASSESSMENT'] as const).map(t => (
                    <button key={t} onClick={() => setItvType(t)}
                      className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium border transition-all',
                        itvType === t ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-border hover:bg-primary/5'
                      )}>
                      {interviewTypeIcon[t]} {t.replace('_',' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data e Ora</label>
                <input type="datetime-local" className="w-full h-9 rounded-xl border border-border bg-background/50 px-3 text-sm" value={itvDate} onChange={e => setItvDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Durata (minuti)</label>
                <input type="number" className="w-full h-9 rounded-xl border border-border bg-background/50 px-3 text-sm" value={itvDuration} onChange={e => setItvDuration(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Link / Luogo</label>
                <input type="text" placeholder="Link Meet o indirizzo" className="w-full h-9 rounded-xl border border-border bg-background/50 px-3 text-sm" value={itvLocation} onChange={e => setItvLocation(e.target.value)} />
              </div>
            </div>
            <textarea className="w-full min-h-[80px] rounded-2xl border border-border bg-background/50 p-3 text-sm resize-none" placeholder="Note colloquio (opzionale)…" value={itvNotes} onChange={e => setItvNotes(e.target.value)} />
            <Button onClick={() => addInterview.mutate()} disabled={!itvDate || addInterview.isPending} className="rounded-xl gap-2">
              <Plus className="w-4 h-4" /> {addInterview.isPending ? 'Salvataggio…' : 'Pianifica'}
            </Button>
          </div>

          {/* Interviews list */}
          <div className="space-y-3">
            {interviews.length === 0 && (
              <div className="glass rounded-3xl p-8 text-center text-muted-foreground text-sm">
                Nessun colloquio programmato.
              </div>
            )}
            {interviews.map((itv: any) => (
              <div key={itv.id} className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      {interviewTypeIcon[itv.type]}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{itv.type.replace('_', ' ')}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(itv.scheduledAt).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}
                        {itv.duration && ` · ${itv.duration} min`}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteInterview.mutate(itv.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {itv.location && (
                  <a href={itv.location.startsWith('http') ? itv.location : undefined} target="_blank" rel="noreferrer"
                    className="text-xs text-primary flex items-center gap-1 hover:underline w-fit">
                    <ExternalLink className="w-3 h-3" />{itv.location}
                  </a>
                )}
                {itv.notes && <p className="text-xs text-muted-foreground">{itv.notes}</p>}
                {/* Outcome buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                  <span className="text-xs text-muted-foreground self-center mr-1">Esito:</span>
                  {(['PASSED','FAILED','NO_SHOW','RESCHEDULED','PENDING'] as const).map(o => (
                    <button key={o} onClick={() => updateOutcome.mutate({ id: itv.id, outcome: o })}
                      className={cn('text-xs px-2.5 py-1 rounded-lg font-medium transition-all border',
                        itv.outcome === o ? outcomeColor[o] + ' border-current/20' : 'text-muted-foreground border-border hover:bg-primary/5'
                      )}>
                      {o.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EDIT TAB ─────────────────────────────────────── */}
      {activeTab === 'edit' && (
        <div className="glass rounded-3xl p-6 space-y-6 max-w-xl">
          <h2 className="font-semibold text-primary flex items-center gap-2"><Pencil className="w-4 h-4" />Modifica rapida</h2>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stato</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(CandidateStatus).map(s => (
                <button key={s} onClick={() => setEditStatus(s)}
                  className={cn('text-sm px-4 py-2 rounded-xl font-medium border transition-all',
                    editStatus === s ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'text-muted-foreground border-border hover:bg-primary/5'
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Note Recruiter</label>
            <textarea
              className="w-full min-h-[140px] rounded-2xl border border-border bg-background/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={saveEdit} disabled={isPending} className="rounded-xl gap-2">
              {isPending ? 'Salvataggio…' : 'Salva Modifiche'}
            </Button>
            <Link href={`/jobs/${candidate.id}/edit`}>
              <Button variant="outline" className="rounded-xl gap-2">
                <Pencil className="w-4 h-4" /> Modifica Completa
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper ────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
