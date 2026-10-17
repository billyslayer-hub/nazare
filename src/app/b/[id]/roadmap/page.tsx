"use client";

import clsx from "clsx";
import { AlertOctagon, CalendarDays, Check, ChevronDown, Flag, Lock, Pencil, Plus, Route, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { PageHeader, useWorkspace } from "@/components/workspace";
import { Badge, Button, Card, CardHeader, ConfirmModal, EmptyState, Field, Input, Modal, ProgressBar, Select, Textarea, levelTone } from "@/components/ui";
import { generateSection, useSectionJob } from "@/lib/client";
import { addDays, formatDate, sectionData, taskIsLocked, today } from "@/lib/project";
import { ROADMAP_STAGES, type RoadmapStage } from "@/lib/schemas";
import { uid, updateProject } from "@/lib/store";
import type { Priority, Task, TaskStatus } from "@/lib/types";

const STATUS: { key: TaskStatus; label: string; tone: "slate" | "sky" | "rose" | "wave" }[] = [
  { key: "todo", label: "To do", tone: "slate" },
  { key: "in_progress", label: "In progress", tone: "sky" },
  { key: "blocked", label: "Blocked", tone: "rose" },
  { key: "done", label: "Done", tone: "wave" },
];

const DEFAULT_CHECKLIST = ["Business registered", "Bank account open", "Pricing finalized", "Payments tested", "Website or storefront live", "Terms & privacy policy published", "Support channel ready", "Launch announcement prepared"];

type Draft = Omit<Task, "id" | "createdAt" | "origin">;

export default function RoadmapPage() {
  const { project } = useWorkspace();
  const toast = useToast();
  const job = useSectionJob(project.id, "execution");
  const [filter, setFilter] = useState<{ status: TaskStatus | "all" | "open"; priority: Priority | "all" }>({ status: "open", priority: "all" });
  const [editing, setEditing] = useState<{ id?: string; draft: Draft } | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const execution = sectionData(project, "execution");
  const tasks = project.tasks;
  const t = today();

  const setTasks = (fn: (tasks: Task[]) => Task[]) => updateProject(project.id, (p) => ({ ...p, tasks: fn(p.tasks) }));
  const patch = (id: string, change: Partial<Task>) => setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, ...change } : x)));

  const done = tasks.filter((x) => x.status === "done").length;
  const overdue = tasks.filter((x) => x.status !== "done" && x.dueDate < t);
  const blocked = tasks.filter((x) => x.status === "blocked");
  const checklist = execution?.launchChecklist?.length ? execution.launchChecklist : DEFAULT_CHECKLIST;
  const checked = checklist.filter((c) => project.checklist[c]).length;

  const visible = tasks.filter(
    (x) =>
      (filter.status === "all" || (filter.status === "open" ? x.status !== "done" : x.status === filter.status)) &&
      (filter.priority === "all" || x.priority === filter.priority),
  );

  const newDraft = (stage: RoadmapStage = ROADMAP_STAGES[0]): Draft => ({ title: "", description: "", stage, priority: "medium", status: "todo", dueDate: addDays(t, 7), dependsOn: [], blocker: "" });

  const saveDraft = () => {
    if (!editing || !editing.draft.title.trim()) return;
    if (editing.id) {
      patch(editing.id, editing.draft);
      toast("Task updated.");
    } else {
      setTasks((ts) => [...ts, { ...editing.draft, id: uid(), origin: "user", createdAt: new Date().toISOString() }]);
      toast("Task added.");
    }
    setEditing(null);
  };

  if (tasks.length === 0 && !execution) {
    return (
      <div>
        <PageHeader eyebrow="Launch roadmap" title="Roadmap & tasks" description="Your plan turned into prioritized tasks with deadlines, dependencies and a launch-readiness checklist." />
        <EmptyState
          icon={<Route className="size-5" />}
          title="No roadmap yet"
          description="Generate the Execution Plan to get a personalized task list across seven stages — from validating the idea to measuring results — or add your own tasks."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => generateSection(project.id, "execution")} loading={job?.status === "loading"} disabled={!project.sections.company}><Sparkles className="size-4" />Generate roadmap</Button>
              <Button variant="secondary" onClick={() => setEditing({ draft: newDraft() })}><Plus className="size-4" />Add a task</Button>
            </div>
          }
        />
        {job?.status === "error" && <p className="mt-3 text-center text-sm text-rose-600">{job.error}</p>}
        <TaskModal editing={editing} setEditing={setEditing} tasks={tasks} onSave={saveDraft} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Launch roadmap"
        title="Roadmap & tasks"
        description="Tasks from your Execution Plan plus anything you add. Regenerating the plan keeps tasks you created or started."
        actions={<Button onClick={() => setEditing({ draft: newDraft() })}><Plus className="size-4" />Add task</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-end justify-between">
            <div><div className="text-xs font-medium uppercase tracking-wide text-slate-500">Progress</div><div className="mt-1 font-display text-2xl font-semibold text-slate-900">{tasks.length ? Math.round((done / tasks.length) * 100) : 0}%<span className="ml-2 text-sm font-normal text-slate-500">{done} of {tasks.length} tasks</span></div></div>
          </div>
          <div className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
            {ROADMAP_STAGES.map((s) => {
              const st = tasks.filter((x) => x.stage === s);
              if (!st.length) return null;
              const pct = st.filter((x) => x.status === "done").length / st.length;
              return <div key={s} title={`${s}: ${Math.round(pct * 100)}%`} className="relative bg-slate-100" style={{ flex: st.length }}><div className="absolute inset-y-0 left-0 bg-wave-500" style={{ width: `${pct * 100}%` }} /></div>;
            })}
          </div>
          <div className="mt-2 text-xs text-slate-400">Segments show each stage, sized by number of tasks.</div>
        </Card>
        <Card className={clsx("p-5", overdue.length && "border-rose-200")}>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500"><CalendarDays className="size-3.5" />Overdue</div>
          <div className={clsx("mt-1 font-display text-2xl font-semibold", overdue.length ? "text-rose-600" : "text-slate-900")}>{overdue.length}</div>
          <div className="mt-1 truncate text-xs text-slate-500">{overdue[0] ? overdue[0].title : "Nothing overdue"}</div>
        </Card>
        <Card className={clsx("p-5", blocked.length && "border-rose-200")}>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500"><AlertOctagon className="size-3.5" />Blocked</div>
          <div className={clsx("mt-1 font-display text-2xl font-semibold", blocked.length ? "text-rose-600" : "text-slate-900")}>{blocked.length}</div>
          <div className="mt-1 truncate text-xs text-slate-500">{blocked[0] ? blocked[0].blocker || blocked[0].title : "No blockers"}</div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="no-print mb-4 flex flex-wrap items-center gap-2">
            <Select className="h-9 w-40" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value as typeof filter.status })} aria-label="Filter by status">
              <option value="open">Open tasks</option><option value="all">All tasks</option>{STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
            <Select className="h-9 w-40" value={filter.priority} onChange={(e) => setFilter({ ...filter, priority: e.target.value as typeof filter.priority })} aria-label="Filter by priority">
              <option value="all">Any priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </Select>
            <span className="text-xs text-slate-500">{visible.length} shown</span>
          </div>

          <div className="space-y-4">
            {ROADMAP_STAGES.map((stage, si) => {
              const stageTasks = visible.filter((x) => x.stage === stage).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
              const all = tasks.filter((x) => x.stage === stage);
              const isCollapsed = collapsed[stage];
              return (
                <Card key={stage}>
                  <button onClick={() => setCollapsed((c) => ({ ...c, [stage]: !c[stage] }))} className="flex w-full items-center gap-3 px-5 py-3.5 text-left">
                    <span className="flex size-6 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-600">{si + 1}</span>
                    <span className="flex-1 font-display text-[15px] font-semibold text-slate-900">{stage}</span>
                    <span className="text-xs tabular-nums text-slate-500">{all.filter((x) => x.status === "done").length}/{all.length}</span>
                    <ChevronDown className={clsx("size-4 text-slate-400 transition", isCollapsed && "-rotate-90")} />
                  </button>
                  {!isCollapsed && (
                    <div className="border-t border-line">
                      {stageTasks.length === 0 && <p className="px-5 py-3 text-sm text-slate-400">{all.length ? "No tasks match the filters." : "No tasks in this stage."}</p>}
                      <ul className="divide-y divide-line">
                        {stageTasks.map((task) => <TaskRow key={task.id} task={task} tasks={tasks} onPatch={(c) => patch(task.id, c)} onEdit={() => setEditing({ id: task.id, draft: { ...task } })} onDelete={() => setDeleting(task)} />)}
                      </ul>
                      <button onClick={() => setEditing({ draft: newDraft(stage) })} className="no-print flex w-full items-center gap-1.5 px-5 py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-wave-700"><Plus className="size-3.5" />Add task to {stage.toLowerCase()}</button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader icon={<Check className="size-4" />} title="Launch readiness" description={`${checked} of ${checklist.length} ready`} />
            <div className="p-4">
              <ProgressBar value={(checked / checklist.length) * 100} className="mb-3" />
              <ul className="space-y-1">
                {checklist.map((item) => (
                  <li key={item}>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1.5 text-sm hover:bg-slate-50">
                      <input type="checkbox" className="mt-0.5 size-4 rounded accent-wave-600" checked={Boolean(project.checklist[item])} onChange={(e) => updateProject(project.id, (p) => ({ ...p, checklist: { ...p.checklist, [item]: e.target.checked } }))} />
                      <span className={clsx(project.checklist[item] ? "text-slate-400 line-through" : "text-slate-700")}>{item}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          {execution && (
            <Card>
              <CardHeader icon={<Flag className="size-4" />} title="Milestones" />
              <ol className="space-y-3 p-5">
                {execution.milestones.map((m) => {
                  const date = addDays(project.createdAt.slice(0, 10), m.week * 7);
                  return (
                    <li key={m.title} className="flex gap-3">
                      <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", date < t ? "bg-slate-300" : "bg-wave-500")} />
                      <div><div className="text-sm font-medium text-slate-800">{m.title}</div><div className="text-xs text-slate-500">{formatDate(date)} · {m.successCriteria}</div></div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}
          {execution && execution.dependencies.length > 0 && (
            <Card>
              <CardHeader icon={<AlertOctagon className="size-4" />} title="Dependencies & risks" />
              <ul className="space-y-2 p-5 text-sm text-slate-600">{execution.dependencies.map((d) => <li key={d}>• {d}</li>)}</ul>
            </Card>
          )}
        </div>
      </div>

      <TaskModal editing={editing} setEditing={setEditing} tasks={tasks} onSave={saveDraft} />
      <ConfirmModal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete task?" body={`“${deleting?.title}” will be removed, along with any dependencies on it.`} onConfirm={() => { if (deleting) setTasks((ts) => ts.filter((x) => x.id !== deleting.id).map((x) => ({ ...x, dependsOn: x.dependsOn.filter((d) => d !== deleting.id) }))); toast("Task deleted."); }} />
    </div>
  );
}

function TaskRow({ task, tasks, onPatch, onEdit, onDelete }: { task: Task; tasks: Task[]; onPatch: (c: Partial<Task>) => void; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const isDone = task.status === "done";
  const overdue = !isDone && task.dueDate < today();
  const locked = taskIsLocked(task, tasks);
  const deps = task.dependsOn.map((id) => tasks.find((x) => x.id === id)).filter((x): x is Task => Boolean(x));

  return (
    <li className="group px-5 py-3">
      <div className="flex items-start gap-3">
        <button onClick={() => onPatch({ status: isDone ? "todo" : "done" })} className={clsx("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition", isDone ? "border-wave-600 bg-wave-600 text-white" : "border-slate-300 hover:border-wave-500")} aria-label={isDone ? "Mark as not done" : "Mark as done"}>
          {isDone && <Check className="size-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={() => setOpen((o) => !o)} className={clsx("text-left text-sm font-medium", isDone ? "text-slate-400 line-through" : "text-slate-900")}>{task.title}</button>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={levelTone[task.priority]}>{task.priority}</Badge>
            <span className={clsx("text-xs", overdue ? "font-medium text-rose-600" : "text-slate-500")}>{overdue ? "Overdue · " : "Due "}{formatDate(task.dueDate)}</span>
            {locked && !isDone && <Badge title={`Waiting on: ${deps.filter((d) => d.status !== "done").map((d) => d.title).join(", ")}`}><Lock className="size-3" />Waiting on {deps.filter((d) => d.status !== "done").length}</Badge>}
            {task.origin === "user" && <Badge tone="sky">Added by you</Badge>}
          </div>
          {open && (
            <div className="mt-2 space-y-2">
              {task.description && <p className="text-sm leading-relaxed text-slate-600">{task.description}</p>}
              {deps.length > 0 && <p className="text-xs text-slate-500">Depends on: {deps.map((d) => `${d.title}${d.status === "done" ? " ✓" : ""}`).join(" · ")}</p>}
            </div>
          )}
          {task.status === "blocked" && (
            <Input className="mt-2 h-8 border-rose-200 text-xs" value={task.blocker} onChange={(e) => onPatch({ blocker: e.target.value })} placeholder="What's blocking this? Who can help?" />
          )}
        </div>
        <div className="no-print flex shrink-0 items-center gap-1">
          <Select aria-label="Status" className="h-8 w-[118px] text-xs" value={task.status} onChange={(e) => onPatch({ status: e.target.value as TaskStatus })}>
            {STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
          <button onClick={onEdit} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Edit task"><Pencil className="size-4" /></button>
          <button onClick={onDelete} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete task"><Trash2 className="size-4" /></button>
        </div>
      </div>
    </li>
  );
}

function TaskModal({ editing, setEditing, tasks, onSave }: { editing: { id?: string; draft: Draft } | null; setEditing: (e: { id?: string; draft: Draft } | null) => void; tasks: Task[]; onSave: () => void }) {
  if (!editing) return null;
  const d = editing.draft;
  const set = (c: Partial<Draft>) => setEditing({ ...editing, draft: { ...d, ...c } });
  const options = tasks.filter((x) => x.id !== editing.id);
  return (
    <Modal open onClose={() => setEditing(null)} title={editing.id ? "Edit task" : "New task"} footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={onSave} disabled={!d.title.trim()}>{editing.id ? "Save" : "Add task"}</Button></>}>
      <div className="space-y-4">
        <Field label="Title"><Input autoFocus value={d.title} onChange={(e) => set({ title: e.target.value })} maxLength={160} /></Field>
        <Field label="Description"><Textarea rows={3} value={d.description} onChange={(e) => set({ description: e.target.value })} maxLength={1000} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stage"><Select value={d.stage} onChange={(e) => set({ stage: e.target.value as RoadmapStage })}>{ROADMAP_STAGES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Priority"><Select value={d.priority} onChange={(e) => set({ priority: e.target.value as Priority })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></Field>
          <Field label="Due date"><Input type="date" value={d.dueDate} onChange={(e) => e.target.value && set({ dueDate: e.target.value })} /></Field>
          <Field label="Status"><Select value={d.status} onChange={(e) => set({ status: e.target.value as TaskStatus })}>{STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
        </div>
        {d.status === "blocked" && <Field label="Blocker"><Input value={d.blocker} onChange={(e) => set({ blocker: e.target.value })} placeholder="What's in the way?" /></Field>}
        {options.length > 0 && (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-800">Depends on</span>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
              {options.map((o) => (
                <label key={o.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-slate-700 hover:bg-slate-50">
                  <input type="checkbox" className="size-4 accent-wave-600" checked={d.dependsOn.includes(o.id)} onChange={(e) => set({ dependsOn: e.target.checked ? [...d.dependsOn, o.id] : d.dependsOn.filter((x) => x !== o.id) })} />
                  <span className="truncate">{o.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
