import { ArrowRight, BrainCircuit, Cpu, FlaskConical, GraduationCap, Layers3, Microscope, Network } from "lucide-react";
import { Link } from "react-router";
import { branding } from "../../config/branding.js";
import { useAuth } from "../../lib/useAuth.js";

const pillars = [
  {
    title: "Artificial Intelligence",
    copy: "Build intelligent applications and understand how AI workloads shape modern engineering systems.",
    icon: BrainCircuit,
    color: "#1070C0",
  },
  {
    title: "Silicon",
    copy: "Develop semiconductor and SoC foundations across design, manufacturing, packaging, and validation.",
    icon: Cpu,
    color: "#0090A0",
  },
  {
    title: "Embedded Systems",
    copy: "Bring silicon to life with firmware, connected products, IoT, edge AI, and real-world product engineering.",
    icon: Network,
    color: "#00A0A0",
  },
];

const tracks = [
  "Semiconductor and SoC Foundations",
  "VLSI and Pre-Silicon Design",
  "Semiconductor Manufacturing",
  "Wafer Test and Back-End Processing",
  "IC Packaging and Package Engineering",
  "Electronics Hardware and Manufacturing",
  "Embedded Systems, IoT, and Edge AI",
  "Quality, Product, and Service Lifecycle",
];

const outcomes = [
  "Industry-led learning paths",
  "Immersive hands-on laboratories",
  "Real-world engineering projects",
  "Mentorship from practitioners",
  "Research and innovation programs",
  "Progress tracking for institutions",
];

export function LandingPage() {
  const { user } = useAuth();
  const workspacePath = user?.role === "ADMIN" ? "/admin/dashboard" : user?.role === "STUDENT" ? "/student/dashboard" : "/login";
  const hasSession = Boolean(user);

  return (
    <div className="landing-page min-h-screen bg-white text-[#001030]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <img className="size-11 object-contain" src={branding.logoMark} alt="" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block text-lg font-semibold tracking-tight">AIXSES</span>
              <span className="block text-xs font-medium uppercase tracking-[0.18em] text-[#1070C0]">Engineering Acceleration</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#pillars" className="hover:text-[#1070C0]">
              Domains
            </a>
            <a href="#tracks" className="hover:text-[#1070C0]">
              Career Tracks
            </a>
            <a href="#coe" className="hover:text-[#1070C0]">
              CoE
            </a>
          </nav>

          {hasSession ? (
            <Link
              to={workspacePath}
              className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1070C0] px-4 text-sm font-semibold text-white shadow-sm shadow-[#1070C0]/25 transition hover:bg-[#0050B0]"
            >
              Open Workspace
              <ArrowRight size={16} />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login/student"
                className="focus-ring inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-[#001030] shadow-sm transition hover:border-[#1070C0] hover:text-[#1070C0] sm:h-11 sm:px-4 sm:text-sm"
              >
                Student Login
              </Link>
              <Link
                to="/login/teacher"
                className="focus-ring inline-flex h-10 items-center justify-center rounded-xl bg-[#1070C0] px-3 text-xs font-semibold text-white shadow-sm shadow-[#1070C0]/25 transition hover:bg-[#0050B0] sm:h-11 sm:px-4 sm:text-sm"
              >
                Teacher Login
              </Link>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="relative isolate min-h-[calc(100vh-5rem)] overflow-hidden border-b border-slate-200">
          <img
            className="pointer-events-none absolute right-[-8rem] top-10 -z-10 w-[58rem] max-w-none opacity-[0.11] sm:opacity-[0.16] lg:right-[-2rem] lg:top-4"
            src={branding.logoFull}
            alt=""
          />
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col justify-center px-4 pb-24 pt-16 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E00020]">Center of Excellence by NYXSES</p>
              <h1 className="mt-5 text-5xl font-semibold tracking-tight text-[#001030] sm:text-7xl lg:text-8xl">AIXSES</h1>
              <p className="mt-6 max-w-3xl text-xl leading-9 text-slate-700 sm:text-2xl">
                Engineering Acceleration Platform for AI, Semiconductor, and Embedded Systems professionals.
              </p>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600">
                AIXSES bridges academia and industry through practical learning, immersive laboratories, real-world
                engineering projects, mentorship, research, and innovation.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {hasSession ? (
                  <Link
                    to={workspacePath}
                    className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1070C0] px-5 text-sm font-semibold text-white shadow-lg shadow-[#1070C0]/20 transition hover:bg-[#0050B0]"
                  >
                    Open Workspace
                    <ArrowRight size={17} />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login/student"
                      className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1070C0] px-5 text-sm font-semibold text-white shadow-lg shadow-[#1070C0]/20 transition hover:bg-[#0050B0]"
                    >
                      Student Login
                      <ArrowRight size={17} />
                    </Link>
                    <Link
                      to="/login/teacher"
                      className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-[#001030] shadow-sm transition hover:border-[#1070C0] hover:text-[#1070C0]"
                    >
                      Teacher Login
                    </Link>
                  </>
                )}
                <a
                  href="#tracks"
                  className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-[#001030] shadow-sm transition hover:border-[#1070C0] hover:text-[#1070C0]"
                >
                  Explore Training Tracks
                </a>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white/80 backdrop-blur-xl">
              <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6 lg:px-8">
                <HeroMetric value="AI" label="Intelligent applications and workloads" />
                <HeroMetric value="Silicon" label="Semiconductors, SoCs, and accelerators" />
                <HeroMetric value="ES" label="Firmware, IoT, edge AI, and products" />
              </div>
            </div>
          </div>
        </section>

        <section id="pillars" className="border-b border-slate-200 bg-slate-50 py-18 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1070C0]">The AIXSES Stack</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">AI, Silicon, and Embedded Systems.</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                The platform is built around the complete intelligent engineering stack, from algorithms to silicon and
                the embedded software that enables real-world products.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <article key={pillar.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <span className="grid size-11 place-items-center rounded-xl text-white" style={{ backgroundColor: pillar.color }}>
                      <Icon size={21} />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">{pillar.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{pillar.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="tracks" className="border-b border-slate-200 bg-white py-18 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0090A0]">Training Tracks</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Programs aligned to the semiconductor lifecycle.</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                AIXSES supports foundation learning, specialization, hands-on labs, and role-oriented progression across
                AI, semiconductor, electronics, and embedded product engineering.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {tracks.map((track, index) => (
                <div key={track} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#001030] text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-sm font-semibold leading-6 text-[#001030]">{track}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="coe" className="bg-[#001030] py-18 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A0A0]">Center of Excellence</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Built for institution-grade engineering readiness.</h2>
              <p className="mt-5 text-base leading-8 text-slate-300">
                The initiative is positioned as an engineering ecosystem, not just another training institute. It helps
                institutions monitor learning, projects, assignments, labs, and measurable progress.
              </p>
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4">
                <img className="size-14 rounded-xl bg-white object-contain p-1" src={branding.logoMark} alt="" />
                <div>
                  <p className="font-semibold">AIXSES by NYXSES</p>
                  <p className="text-sm text-slate-300">Accelerating both technology and talent.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {outcomes.map((outcome, index) => {
                const icons = [GraduationCap, FlaskConical, Cpu, Network, Microscope, BrainCircuit];
                const Icon = icons[index] || GraduationCap;
                return (
                  <div key={outcome} className="rounded-2xl border border-white/15 bg-white/5 p-4">
                    <Icon className="text-[#00A0A0]" size={21} />
                    <p className="mt-4 text-sm font-semibold leading-6">{outcome}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function HeroMetric({ value, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl font-semibold text-[#1070C0]">{value}</span>
      <span className="text-sm leading-5 text-slate-600">{label}</span>
    </div>
  );
}
