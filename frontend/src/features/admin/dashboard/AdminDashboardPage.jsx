import { useQuery } from "@tanstack/react-query";
import { Activity, BookOpen, ClipboardList, GraduationCap, Users } from "lucide-react";
import { Card } from "../../../components/ui/Card.jsx";
import { api } from "../../../lib/api.js";
import { formatPercent } from "../../../lib/utils.js";

function Metric({ label, value, icon: Icon }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className="grid size-11 place-items-center rounded-md bg-blue-50 text-blue-700">
          <Icon size={22} />
        </div>
      </div>
    </Card>
  );
}

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await api.get("/admin/dashboard")).data.data,
  });

  if (isLoading) return <p className="text-sm text-slate-500">Loading dashboard</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Admin Dashboard</h1>
        <p className="text-sm text-slate-500">Institute-wide learning and assessment snapshot.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Metric label="Total Students" value={data?.totalStudents || 0} icon={Users} />
        <Metric label="Active Students" value={data?.activeStudents || 0} icon={GraduationCap} />
        <Metric label="Subjects" value={data?.subjects || 0} icon={BookOpen} />
        <Metric label="Assessments" value={data?.assessments || 0} icon={ClipboardList} />
        <Metric label="Average Completion" value={formatPercent(data?.averageCompletion)} icon={Activity} />
        <Metric label="Average Score" value={formatPercent(data?.averageScore)} icon={Activity} />
      </div>
    </div>
  );
}
