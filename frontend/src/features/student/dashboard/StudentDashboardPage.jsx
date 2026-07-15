import { useQuery } from "@tanstack/react-query";
import { BookOpen, ClipboardCheck, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "../../../components/ui/Card.jsx";
import { StatusBadge } from "../../../components/ui/StatusBadge.jsx";
import { api } from "../../../lib/api.js";
import { formatPercent } from "../../../lib/utils.js";

export function StudentDashboardPage() {
  const dashboard = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: async () => (await api.get("/student/dashboard")).data.data,
  });

  const data = dashboard.data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Student Dashboard</h1>
        <p className="text-sm text-slate-500">Your learning progress and recent assessment results.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <TrendingUp className="mb-3 text-blue-700" size={22} />
          <p className="text-sm text-slate-500">Overall Progress</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPercent(data?.overallProgress)}</p>
        </Card>
        <Card>
          <ClipboardCheck className="mb-3 text-emerald-700" size={22} />
          <p className="text-sm text-slate-500">Average Score</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPercent(data?.averageScore)}</p>
        </Card>
        <Card>
          <BookOpen className="mb-3 text-slate-700" size={22} />
          <p className="text-sm text-slate-500">Assigned Subjects</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{data?.subjects?.length || 0}</p>
        </Card>
      </div>
      <Card>
        <CardHeader title="Recent Progress" description="Latest module progress updates." />
        <div className="space-y-3">
          {(data?.recentProgress || []).map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
              <div>
                <p className="font-medium text-slate-950">{item.module.title}</p>
                <p className="text-sm text-slate-500">{item.module.phase.subject.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">{formatPercent(item.completionPercent)}</span>
                <StatusBadge value={item.status} />
              </div>
            </div>
          ))}
          {!data?.recentProgress?.length ? <p className="text-sm text-slate-500">No progress yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
