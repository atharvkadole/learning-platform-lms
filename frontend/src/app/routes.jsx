import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "../components/layout/AppLayout.jsx";
import { useAuth } from "../lib/useAuth.js";
import { LoginPage } from "../features/auth/LoginPage.jsx";
import { AdminDashboardPage } from "../features/admin/dashboard/AdminDashboardPage.jsx";
import { StudentsPage } from "../features/admin/students/StudentsPage.jsx";
import { LearningPathPage } from "../features/admin/learning-path/LearningPathPage.jsx";
import { AssessmentsPage } from "../features/admin/assessments/AssessmentsPage.jsx";
import { ReportsPage } from "../features/admin/reports/ReportsPage.jsx";
import { StudentDashboardPage } from "../features/student/dashboard/StudentDashboardPage.jsx";
import { StudentModulesPage } from "../features/student/modules/StudentModulesPage.jsx";
import { StudentAssessmentsPage } from "../features/student/assessments/StudentAssessmentsPage.jsx";
import { StudentProfilePage } from "../features/student/profile/StudentProfilePage.jsx";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "ADMIN" ? "/admin/dashboard" : "/student/dashboard"} replace />;
}

function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
        Loading workspace
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <AppLayout role="ADMIN" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="learning-path" element={<LearningPathPage />} />
        <Route path="assessments" element={<AssessmentsPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
      <Route
        path="/student"
        element={
          <ProtectedRoute role="STUDENT">
            <AppLayout role="STUDENT" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboardPage />} />
        <Route path="modules" element={<StudentModulesPage />} />
        <Route path="assessments" element={<StudentAssessmentsPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

