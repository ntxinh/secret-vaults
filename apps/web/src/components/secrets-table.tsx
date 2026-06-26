"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { Secret } from "../lib/schema";
import { ENVIRONMENTS, SECRET_TYPE_LABELS, SECRET_TYPES } from "../lib/schema";
import { useToastStore } from "../store/toasts";
import { useUiStore } from "../store/ui";

const columnHelper = createColumnHelper<Secret>();

function ValueCell({ secret }: { secret: Secret }) {
  const revealed = useUiStore((s) => Boolean(s.revealedIds[secret.id]));
  const toggleRevealed = useUiStore((s) => s.toggleRevealed);
  const push = useToastStore((s) => s.push);

  async function copy() {
    await navigator.clipboard.writeText(secret.value);
    push("Copied to clipboard");
  }

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <span className="max-w-48 truncate">{revealed ? secret.value : "••••••••"}</span>
      <button
        type="button"
        onClick={() => toggleRevealed(secret.id)}
        title={revealed ? "Hide" : "Reveal"}
        className="text-zinc-400 hover:text-zinc-100"
      >
        {revealed ? "🙈" : "👁"}
      </button>
      <button type="button" onClick={copy} title="Copy" className="text-zinc-400 hover:text-zinc-100">
        📋
      </button>
    </div>
  );
}

interface Props {
  secrets: Secret[];
  onEdit: (secret: Secret) => void;
  onDelete: (secret: Secret) => void;
}

export function SecretsTable({ secrets, onEdit, onDelete }: Props) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [envFilter, setEnvFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const projects = useMemo(
    () => [...new Set(secrets.map((s) => s.project).filter(Boolean))].sort(),
    [secrets],
  );

  const filtered = useMemo(
    () =>
      secrets.filter(
        (s) =>
          (typeFilter === "" || s.type === typeFilter) &&
          (envFilter === "" || s.environment.includes(envFilter as Secret["environment"][number])) &&
          (projectFilter === "" || s.project === projectFilter),
      ),
    [secrets, typeFilter, envFilter, projectFilter],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => SECRET_TYPE_LABELS[info.getValue()],
      }),
      columnHelper.accessor("project", { header: "Project" }),
      columnHelper.accessor("environment", {
        header: "Env",
        cell: (info) => (
          <div className="flex flex-wrap gap-1">
            {info.getValue().map((env) => (
              <span key={env} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">{env}</span>
            ))}
          </div>
        ),
      }),
      columnHelper.accessor("tags", {
        header: "Tags",
        cell: (info) => (
          <div className="flex flex-wrap gap-1">
            {info.getValue().map((t) => (
              <span key={t} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs">{t}</span>
            ))}
          </div>
        ),
        filterFn: "includesString",
      }),
      columnHelper.display({
        id: "value",
        header: "Value",
        cell: (info) => <ValueCell secret={info.row.original} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <div className="flex justify-end gap-2 text-sm">
            <button
              type="button"
              onClick={() => onEdit(info.row.original)}
              className="text-zinc-400 hover:text-zinc-100"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(info.row.original)}
              className="text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          </div>
        ),
      }),
    ],
    [onEdit, onDelete],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, value: string) => {
      const q = value.toLowerCase();
      const s = row.original;
      return [s.name, s.project, s.notes, ...s.tags, ...s.environment].some((f) => f.toLowerCase().includes(q));
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectCls = "rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search name, project, tags, notes…"
          className="w-full max-w-xs rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
          <option value="">All types</option>
          {SECRET_TYPES.map((t) => (
            <option key={t} value={t}>{SECRET_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select value={envFilter} onChange={(e) => setEnvFilter(e.target.value)} className={selectCls}>
          <option value="">All envs</option>
          {ENVIRONMENTS.map((e2) => (
            <option key={e2} value={e2}>{e2}</option>
          ))}
        </select>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={selectCls}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-400">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-zinc-500">
                  No secrets found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-900/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
