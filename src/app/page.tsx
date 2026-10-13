"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Task = {
  id: string;
  course: string;
  title: string;
  due_date: string; // YYYY-MM-DD
  est_hours: number;
  done: boolean;
};

function daysUntil(dueDate: string): number {
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function dueLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} day(s) overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [course, setCourse] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estHours, setEstHours] = useState("1");

  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("done", { ascending: true })
      .order("due_date", { ascending: true });

    if (error) setError(error.message);
    else {
      setError("");
      setTasks(data as Task[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!course.trim() || !title.trim() || !dueDate) {
      setError("Please fill in course, title, and due date.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      course: course.trim(),
      title: title.trim(),
      due_date: dueDate,
      est_hours: Number(estHours) || 0,
    });
    
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setTitle("");
    setDueDate("");
    setEstHours("1");
    await loadTasks();
  }

  async function toggleDone(task: Task) {
    const { error } = await supabase
      .from("tasks")
      .update({ done: !task.done })
      .eq("id", task.id);
    if (error) setError(error.message);
    else await loadTasks();
  }

  async function removeTask(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) setError(error.message);
    else await loadTasks();
  }

  const open = tasks.filter((t) => !t.done);
  const overdue = open.filter((t) => daysUntil(t.due_date) < 0).length;
  const hoursLeft = open.reduce((sum, t) => sum + Number(t.est_hours), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <h1 className="text-xl font-bold">Academic Planner</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-2xl font-bold">{open.length}</p>
            <p className="text-xs text-slate-500">Open tasks</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-2xl font-bold text-red-600">{overdue}</p>
            <p className="text-xs text-slate-500">Overdue</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-2xl font-bold">{hoursLeft}h</p>
            <p className="text-xs text-slate-500">Work left</p>
          </div>
        </section>

        <form
          onSubmit={addTask}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <h2 className="font-semibold">Add a task</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              placeholder="Course (e.g. Calculus 1)"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            />
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <input
              type="number"
              min="0"
              step="0.5"
              className="rounded-md border border-slate-300 px-3 py-2"
              placeholder="Estimated hours"
              value={estHours}
              onChange={(e) => setEstHours(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add task"}
          </button>
        </form>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
          {loading ? (
            <p className="text-slate-500">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
              No tasks yet. Add your first one above.
            </p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => {
                const days = daysUntil(task.due_date);
                const isOverdue = !task.done && days < 0;
                const isSoon = !task.done && days >= 0 && days <= 2;
                const style = isOverdue
                  ? "border-red-300 bg-red-50"
                  : isSoon
                  ? "border-amber-300 bg-amber-50"
                  : "border-slate-200 bg-white";

                return (
                  <li
                    key={task.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${style} ${
                      task.done ? "opacity-60" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleDone(task)}
                      aria-label={`Mark ${task.title} as done`}
                      className="mt-1 h-5 w-5 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${task.done ? "line-through" : ""}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {task.course} · {task.est_hours}h · {task.due_date}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p
                        className={`font-semibold ${
                          task.done
                            ? "text-slate-500"
                            : isOverdue
                            ? "text-red-600"
                            : isSoon
                            ? "text-amber-700"
                            : "text-slate-700"
                        }`}
                      >
                        {task.done ? "Done" : dueLabel(days)}
                      </p>
                      <button
                        onClick={() => removeTask(task.id)}
                        className="mt-1 text-slate-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}