import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../../components/ui/Card.jsx";
import { Input, Select } from "../../../components/ui/Field.jsx";
import { EmptyState, ErrorState, LoadingState } from "../../../components/ui/Page.jsx";
import { StatusBadge } from "../../../components/ui/StatusBadge.jsx";
import { api, downloadUrl } from "../../../lib/api.js";
import { cn } from "../../../lib/utils.js";

function percentText(value) {
  if (value === null || value === undefined) return "N/A";
  return `${Math.round(Number(value) || 0)}%`;
}

function buildQueryString(search, subjectId) {
  const params = new URLSearchParams();
  const trimmedSearch = search.trim();
  if (trimmedSearch) params.set("search", trimmedSearch);
  if (subjectId) params.set("subjectId", subjectId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function SummaryTile({ label, value, hint }) {
  return (
    <div className="lms-soft rounded-xl border px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ProgressCell({ value, completed, total }) {
  if (value === null || value === undefined) {
    return <span className="text-sm font-medium text-slate-400">N/A</span>;
  }

  const percent = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

  return (
    <div className="min-w-32">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-950">{percent}%</span>
        {typeof total === "number" ? (
          <span className="text-xs text-slate-500">
            {completed}/{total}
          </span>
        ) : null}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function DownloadLink({ href, variant = "primary", children }) {
  const className = cn(
    "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition",
    variant === "primary"
      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
      : "border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
  );

  return (
    <a className={className} href={href}>
      <Download size={16} />
      {children}
    </a>
  );
}

function ReportTable({ rows }) {
  if (!rows.length) {
    return (
      <EmptyState
        title="No progress records found"
        description="Try a different search or assign students to subjects before reviewing progress."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[1120px] divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Student</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Theory</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Lab</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Assignments</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Projects</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Overall</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Score</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              <td className="px-4 py-4">
                <p className="font-semibold text-slate-950">{row.student}</p>
                <p className="mt-1 text-xs text-slate-500">{row.email}</p>
              </td>
              <td className="px-4 py-4">
                <p className="max-w-56 font-medium text-slate-800">{row.subject}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {row.modulesTotal} modules / {row.materialsTotal} materials
                </p>
              </td>
              <td className="px-4 py-4">
                <ProgressCell value={row.theoryPercent} completed={row.theoryCompleted} total={row.theoryTotal} />
              </td>
              <td className="px-4 py-4">
                <ProgressCell value={row.labPercent} completed={row.labCompleted} total={row.labTotal} />
              </td>
              <td className="px-4 py-4">
                <ProgressCell value={row.assignmentPercent} completed={row.assignmentsCompleted} total={row.assignmentsTotal} />
              </td>
              <td className="px-4 py-4">
                <ProgressCell value={row.projectPercent} completed={row.projectsCompleted} total={row.projectsTotal} />
              </td>
              <td className="px-4 py-4">
                <ProgressCell value={row.overallPercent} />
              </td>
              <td className="px-4 py-4 font-medium text-slate-800">{percentText(row.latestScore)}</td>
              <td className="px-4 py-4">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {row.pendingActivities}
                </span>
              </td>
              <td className="px-4 py-4">
                <StatusBadge value={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsPage() {
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const querySuffix = useMemo(() => buildQueryString(search, subjectId), [search, subjectId]);

  const report = useQuery({
    queryKey: ["admin-student-progress-report", search.trim(), subjectId],
    queryFn: async () =>
      (
        await api.get("/admin/reports/student-progress", {
          params: {
            search: search.trim() || undefined,
            subjectId: subjectId || undefined,
          },
        })
      ).data.data,
  });

  const data = report.data || { rows: [], subjects: [], summary: {} };
  const summary = data.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            View offline-course progress by theory, lab, assignments, and projects.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <DownloadLink href={downloadUrl(`/admin/reports/student-progress.xlsx${querySuffix}`)}>Excel</DownloadLink>
          <DownloadLink href={downloadUrl(`/admin/reports/student-progress.pdf${querySuffix}`)} variant="secondary">
            PDF
          </DownloadLink>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Student Progress Tracking"
          description="Search by student and filter by subject before reviewing or exporting the report."
          action={
            <Button variant="secondary" className="h-10 px-3" onClick={() => report.refetch()} disabled={report.isFetching}>
              <RefreshCw size={16} className={cn(report.isFetching && "animate-spin")} />
              Refresh
            </Button>
          }
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <Input
              className="pl-10"
              placeholder="Search student name, email, or subject"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            <option value="">All subjects</option>
            {(data.subjects || []).map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Students" value={summary.students || 0} hint={`${summary.subjects || 0} subjects in view`} />
        <SummaryTile label="Average Overall" value={percentText(summary.averageOverall || 0)} hint="Across visible rows" />
        <SummaryTile label="Pending Activities" value={summary.pendingActivities || 0} hint="Theory, lab, assignments, projects" />
        <SummaryTile label="At Risk" value={summary.atRisk || 0} hint="Below 50% with pending work" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Theory Avg" value={percentText(summary.averageTheory || 0)} />
        <SummaryTile label="Lab Avg" value={percentText(summary.averageLab || 0)} />
        <SummaryTile label="Assignment Avg" value={percentText(summary.averageAssignments || 0)} />
        <SummaryTile label="Project Avg" value={percentText(summary.averageProjects || 0)} />
      </div>

      {report.isLoading ? (
        <LoadingState title="Loading report" description="Building progress rows from assigned subjects." />
      ) : report.isError ? (
        <ErrorState
          title="Could not load report"
          description={report.error?.response?.data?.message || "Refresh the report after checking the backend."}
          onRetry={() => report.refetch()}
        />
      ) : (
        <Card>
          <CardHeader
            title="Progress Matrix"
            description="Each row represents one student assigned to one subject."
          />
          <ReportTable rows={data.rows || []} />
        </Card>
      )}
    </div>
  );
}
