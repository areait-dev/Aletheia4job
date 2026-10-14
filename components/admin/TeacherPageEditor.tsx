'use client';

import { useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { resetTeacherPageContentAction, saveTeacherPageContentAction } from '@/utils/actions/pageContent';
import { DEFAULT_TEACHER_PAGE_CONTENT, type TeacherPageContent } from '@/utils/teacherPageContent';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type Props = { initial: TeacherPageContent; isCustom: boolean };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function moveItem<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border p-4 sm:p-5 space-y-4 bg-card">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function RowTools({
  index,
  count,
  onMove,
  onRemove,
  canRemove,
}: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="Sposta su">
        <ArrowUp className="w-4 h-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label="Sposta giù">
        <ArrowDown className="w-4 h-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600" disabled={!canRemove} onClick={onRemove} aria-label="Elimina">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default function TeacherPageEditor({ initial, isCustom }: Props) {
  const [content, setContent] = useState<TeacherPageContent>(() => clone(initial));
  const [custom, setCustom] = useState(isCustom);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const update = (fn: (draft: TeacherPageContent) => void) => {
    setContent((prev) => {
      const draft = clone(prev);
      fn(draft);
      return draft;
    });
    setDirty(true);
  };

  const save = () =>
    startTransition(async () => {
      const result = await saveTeacherPageContentAction(content);
      if (result.ok) {
        setDirty(false);
        setCustom(true);
        toast({ title: 'Pagina aggiornata', description: 'Le modifiche sono già online su /diventa-docente.' });
      } else {
        toast({ title: 'Non salvato', description: result.error, variant: 'destructive' });
      }
    });

  const reset = () => {
    if (!window.confirm('Ripristinare i testi originali? Le modifiche salvate verranno perse.')) return;
    startTransition(async () => {
      const result = await resetTeacherPageContentAction();
      if (result.ok) {
        setContent(clone(DEFAULT_TEACHER_PAGE_CONTENT));
        setCustom(false);
        setDirty(false);
        toast({ title: 'Testi originali ripristinati' });
      } else {
        toast({ title: 'Ripristino non riuscito', description: result.error, variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          {custom
            ? 'Stai modificando una versione personalizzata dei testi.'
            : 'La pagina usa i testi originali. Salva per personalizzarli.'}{' '}
          Per mettere in grassetto una parola racchiudila tra due asterischi: <code>**così**</code>.
        </p>
        <a
          href="/diventa-docente"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Apri la pagina <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <Section title="Testata (in alto)" description="Titolo, testo introduttivo e pulsante.">
        <Field label="Titolo">
          <Textarea rows={2} value={content.hero.title} onChange={(e) => update((d) => { d.hero.title = e.target.value; })} />
        </Field>
        <Field label="Testo">
          <Textarea rows={4} value={content.hero.text} onChange={(e) => update((d) => { d.hero.text = e.target.value; })} />
        </Field>
        <Field label="Testo del pulsante">
          <Input value={content.hero.cta} onChange={(e) => update((d) => { d.hero.cta = e.target.value; })} />
        </Field>
      </Section>

      <Section title="Presentazione">
        <Field label="Titolo">
          <Input value={content.intro.title} onChange={(e) => update((d) => { d.intro.title = e.target.value; })} />
        </Field>
        {content.intro.paragraphs.map((p, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <Field label={`Paragrafo ${i + 1}`}>
                <Textarea rows={4} value={p} onChange={(e) => update((d) => { d.intro.paragraphs[i] = e.target.value; })} />
              </Field>
            </div>
            <div className="pt-6">
              <RowTools
                index={i}
                count={content.intro.paragraphs.length}
                canRemove={content.intro.paragraphs.length > 1}
                onMove={(to) => update((d) => { d.intro.paragraphs = moveItem(d.intro.paragraphs, i, to); })}
                onRemove={() => update((d) => { d.intro.paragraphs.splice(i, 1); })}
              />
            </div>
          </div>
        ))}
        {content.intro.paragraphs.length < 4 && (
          <Button type="button" variant="outline" size="sm" onClick={() => update((d) => { d.intro.paragraphs.push(''); })}>
            <Plus className="w-4 h-4 mr-1.5" /> Aggiungi paragrafo
          </Button>
        )}
      </Section>

      <Section title="A chi ci rivolgiamo" description="Ogni voce è composta da un ruolo (in grassetto) e dal suo completamento.">
        <Field label="Titolo">
          <Input value={content.audience.title} onChange={(e) => update((d) => { d.audience.title = e.target.value; })} />
        </Field>
        <Field label="Frase introduttiva">
          <Textarea rows={2} value={content.audience.intro} onChange={(e) => update((d) => { d.audience.intro = e.target.value; })} />
        </Field>
        <div className="space-y-3">
          {content.audience.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
              <div className="flex-1 grid sm:grid-cols-[14rem_1fr] gap-3">
                <Field label="Ruolo">
                  <Input value={item.role} onChange={(e) => update((d) => { d.audience.items[i].role = e.target.value; })} />
                </Field>
                <Field label="Descrizione">
                  <Input value={item.text} onChange={(e) => update((d) => { d.audience.items[i].text = e.target.value; })} />
                </Field>
              </div>
              <div className="pt-6">
                <RowTools
                  index={i}
                  count={content.audience.items.length}
                  canRemove={content.audience.items.length > 1}
                  onMove={(to) => update((d) => { d.audience.items = moveItem(d.audience.items, i, to); })}
                  onRemove={() => update((d) => { d.audience.items.splice(i, 1); })}
                />
              </div>
            </div>
          ))}
        </div>
        {content.audience.items.length < 8 && (
          <Button type="button" variant="outline" size="sm" onClick={() => update((d) => { d.audience.items.push({ role: '', text: '' }); })}>
            <Plus className="w-4 h-4 mr-1.5" /> Aggiungi voce
          </Button>
        )}
      </Section>

      <Section title="Come funziona" description="I passaggi vengono numerati in automatico, nell'ordine in cui li metti.">
        <Field label="Titolo">
          <Input value={content.steps.title} onChange={(e) => update((d) => { d.steps.title = e.target.value; })} />
        </Field>
        <div className="space-y-3">
          {content.steps.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
              <span className="mt-7 w-6 h-6 shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex-1 space-y-3">
                <Field label="Titolo del passaggio">
                  <Input value={item.title} onChange={(e) => update((d) => { d.steps.items[i].title = e.target.value; })} />
                </Field>
                <Field label="Descrizione">
                  <Textarea rows={3} value={item.text} onChange={(e) => update((d) => { d.steps.items[i].text = e.target.value; })} />
                </Field>
              </div>
              <div className="pt-6">
                <RowTools
                  index={i}
                  count={content.steps.items.length}
                  canRemove={content.steps.items.length > 1}
                  onMove={(to) => update((d) => { d.steps.items = moveItem(d.steps.items, i, to); })}
                  onRemove={() => update((d) => { d.steps.items.splice(i, 1); })}
                />
              </div>
            </div>
          ))}
        </div>
        {content.steps.items.length < 6 && (
          <Button type="button" variant="outline" size="sm" onClick={() => update((d) => { d.steps.items.push({ title: '', text: '' }); })}>
            <Plus className="w-4 h-4 mr-1.5" /> Aggiungi passaggio
          </Button>
        )}
      </Section>

      <Section title="Sopra il modulo di candidatura" description="I campi del modulo (aree, profili, modalità) non si modificano da qui.">
        <Field label="Titolo">
          <Input value={content.form.title} onChange={(e) => update((d) => { d.form.title = e.target.value; })} />
        </Field>
        <Field label="Testo">
          <Textarea rows={3} value={content.form.text} onChange={(e) => update((d) => { d.form.text = e.target.value; })} />
        </Field>
      </Section>

      <div className="sticky bottom-0 -mx-1 px-1 py-3 bg-background/90 backdrop-blur border-t flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={reset} disabled={isPending || !custom}>
          <RotateCcw className="w-4 h-4 mr-1.5" /> Ripristina testi originali
        </Button>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-muted-foreground">Modifiche non salvate</span>}
          <Button type="button" onClick={save} disabled={isPending || !dirty}>
            <Save className="w-4 h-4 mr-1.5" /> {isPending ? 'Salvataggio…' : 'Salva e pubblica'}
          </Button>
        </div>
      </div>
    </div>
  );
}
