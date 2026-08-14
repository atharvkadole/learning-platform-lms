import { cn } from "../../lib/utils.js";

export function Button({ className, variant = "primary", type = "button", ...props }) {
  const variants = {
    primary: "bg-[#1070C0] text-white shadow-sm shadow-[#1070C0]/20 hover:bg-[#0050B0]",
    secondary: "border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50",
    danger: "bg-[#E00020] text-white shadow-sm shadow-[#E00020]/20 hover:bg-[#B8001A]",
    ghost: "text-slate-700 hover:bg-slate-100",
  };

  return (
    <button
      type={type}
      className={cn(
        "focus-ring inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
