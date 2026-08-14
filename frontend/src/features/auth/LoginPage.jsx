import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../../components/ui/Button.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { Field, Input } from "../../components/ui/Field.jsx";
import { branding } from "../../config/branding.js";
import { useAuth } from "../../lib/useAuth.js";
import { cn } from "../../lib/utils.js";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const portalConfig = {
  student: {
    role: "STUDENT",
    title: "Student Login",
    eyebrow: "Student Portal",
    description: "Access assigned subjects, phases, modules, assessments, and progress.",
    icon: BookOpen,
    path: "/login/student",
  },
  teacher: {
    role: "ADMIN",
    title: "Teacher Login",
    eyebrow: "Teacher Workspace",
    description: "Manage students, curriculum, assessments, questions, reports, and learning progress.",
    icon: ShieldCheck,
    path: "/login/teacher",
  },
};

export function LoginPage({ portal }) {
  const config = portalConfig[portal];

  if (!config) {
    return <LoginChooser />;
  }

  return <PortalLogin config={config} />;
}

function LoginChooser() {
  return (
    <LoginShell>
      <Card className="w-full max-w-3xl p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950">Choose Login</h1>
            <p className="text-sm text-slate-500">Select the workspace you want to enter.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <LoginOption config={portalConfig.student} accent="blue" />
          <LoginOption config={portalConfig.teacher} accent="teal" />
        </div>

        <Link
          to="/"
          className="focus-ring mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back to Website
        </Link>
      </Card>
    </LoginShell>
  );
}

function LoginOption({ config, accent }) {
  const Icon = config.icon;
  const accentClass =
    accent === "teal"
      ? "bg-[#0090A0] shadow-[#0090A0]/20 group-hover:bg-[#007D88]"
      : "bg-[#1070C0] shadow-[#1070C0]/20 group-hover:bg-[#0050B0]";

  return (
    <Link
      to={config.path}
      className="group focus-ring rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#1070C0] hover:shadow-lg"
    >
      <span className={cn("grid size-11 place-items-center rounded-xl text-white shadow-sm", accentClass)}>
        <Icon size={21} />
      </span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#1070C0]">{config.eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">{config.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{config.description}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1070C0]">
        Continue
        <ArrowRight size={16} />
      </span>
    </Link>
  );
}

function PortalLogin({ config }) {
  const { login, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const Icon = config.icon;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values) {
    try {
      const user = await login(values);

      if (user.role !== config.role) {
        try {
          await logout();
        } finally {
          setUser(null);
        }
        toast.error(`This account is not allowed in the ${config.title}.`);
        return;
      }

      navigate(user.role === "ADMIN" ? "/admin/dashboard" : "/student/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    }
  }

  return (
    <LoginShell>
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1070C0]">{config.eyebrow}</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{config.title}</h1>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#001030] text-white">
              <Icon size={19} />
            </span>
            <p className="text-sm leading-6 text-slate-600">{config.description}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register("email")} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <Input type="password" autoComplete="current-password" {...register("password")} />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in" : `Sign in as ${config.title.replace(" Login", "")}`}
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <Link to="/login" className="text-sm font-medium text-slate-500 transition hover:text-[#1070C0]">
            Change login type
          </Link>
          <Link to="/" className="text-sm font-medium text-slate-500 transition hover:text-[#1070C0]">
            Back to website
          </Link>
        </div>
      </Card>
    </LoginShell>
  );
}

function LoginShell({ children }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,rgba(16,112,192,0.16),transparent_32%),var(--surface-page)] px-4 py-10">
      <div className="w-full">
        <div className="mx-auto mb-6 flex max-w-3xl items-center justify-center">
          <img className="h-16 w-auto object-contain" src={branding.logoFull} alt={branding.appName} />
        </div>
        <div className="mx-auto flex justify-center">{children}</div>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-[#1070C0]/20 ring-1 ring-slate-200">
      <img className="size-11 object-contain" src={branding.logoMark} alt="" />
    </div>
  );
}
