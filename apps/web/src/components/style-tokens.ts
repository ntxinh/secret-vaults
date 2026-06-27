const controlBase =
  "inline-flex items-center justify-center gap-2 rounded-md border border-transparent text-sm font-medium transition-colors disabled:opacity-50";

export const buttonClasses = {
  primary: `${controlBase} min-h-12 px-4 py-3 bg-[#FCD535] text-zinc-950`,
  secondary: `${controlBase} min-h-11 px-4 py-3 bg-zinc-900 text-zinc-100 border-zinc-700`,
  ghost: `${controlBase} min-h-11 px-4 py-3 text-zinc-100`,
  danger: `${controlBase} min-h-11 px-4 py-3 bg-red-600 text-white border-red-600`,
};

const fieldBase =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FCD535]/40";

export const fieldClasses = {
  input: `${fieldBase} min-h-11`,
  select: `${fieldBase} min-h-11`,
  textarea: `${fieldBase} min-h-24`,
};

export const labelClasses = "text-sm leading-5 text-zinc-400";

export const chipClasses =
  "inline-flex min-h-8 items-center rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium leading-5 text-zinc-100";

export const iconButtonClasses =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2.5 text-zinc-400 transition-colors hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#FCD535]/40";

export const dialogClasses = {
  overlay: "fixed inset-0 z-40 bg-black/60",
  panel:
    "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-7",
  title: "text-xl font-semibold text-zinc-100",
  description: "mt-3 text-base leading-7 text-zinc-400",
};
