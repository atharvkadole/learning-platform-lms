import { Card, CardHeader } from "../../../components/ui/Card.jsx";
import { useAuth } from "../../../lib/useAuth.js";

export function StudentProfilePage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Profile</h1>
        <p className="text-sm text-slate-500">Personal account details.</p>
      </div>
      <Card>
        <CardHeader title="Personal Details" />
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Name</dt>
            <dd className="font-medium text-slate-950">
              {user?.firstName} {user?.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Email</dt>
            <dd className="font-medium text-slate-950">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Role</dt>
            <dd className="font-medium text-slate-950">{user?.role}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Status</dt>
            <dd className="font-medium text-slate-950">{user?.status}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

