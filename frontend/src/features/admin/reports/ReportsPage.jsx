import { Download } from "lucide-react";
import { Card, CardHeader } from "../../../components/ui/Card.jsx";
import { downloadUrl } from "../../../lib/api.js";

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Reports</h1>
        <p className="text-sm text-slate-500">Export progress data for administrative review.</p>
      </div>
      <Card>
        <CardHeader title="Student Progress Report" description="Exports module completion, status, and assessment pass data." />
        <div className="flex flex-wrap gap-3">
          <a
            className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
            href={downloadUrl("/admin/reports/student-progress.xlsx")}
          >
            <Download size={16} />
            Excel
          </a>
          <a
            className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
            href={downloadUrl("/admin/reports/student-progress.pdf")}
          >
            <Download size={16} />
            PDF
          </a>
        </div>
      </Card>
    </div>
  );
}
