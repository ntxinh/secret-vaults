"use client";

import * as Toast from "@radix-ui/react-toast";
import { useToastStore } from "../store/toasts";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <Toast.Provider swipeDirection="right" duration={4000}>
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
          className={`rounded-md px-6 py-5 text-lg leading-7 shadow-lg ${
            t.variant === "error" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-100"
          }`}
        >
          <Toast.Title>{t.title}</Toast.Title>
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed bottom-4 left-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-[28rem] flex-col gap-2 sm:left-auto sm:right-4 sm:w-[26rem]" />
    </Toast.Provider>
  );
}
