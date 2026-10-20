"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  optional?: boolean;
  /** Adımı yapan düğme; çoğunlukla aynı sayfada pencere açıyor. */
  action: React.ReactNode;
};

const HIDE_KEY = "davetpro:baslangic-rehberi-gizli";

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    // Gizli pencere vb.: tercih okunamıyorsa kart görünür kalır.
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Yeni hesapların panelinde başlangıç rehberi.
 *
 * Adımlar kayıtlara bakılarak sunucuda işaretleniyor; kullanıcı elle
 * işaretlemiyor. Zorunlu adımların hepsi bitince kart kendiliğinden
 * kayboluyor; erkenden "gizle" denirse bu tarayıcıda bir daha çıkmıyor.
 * Gizleme yalnızca bir kolaylık — kaybolsa da rehber kendini tekrar
 * gösterir, veri kaybı olmaz.
 */
export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  // Sunucuda ve ilk çizimde görünür; tercih tarayıcıdan sonra okunuyor.
  const storedHidden = useSyncExternalStore(subscribe, readHidden, () => false);
  const [dismissed, setDismissed] = useState(false);
  const hidden = storedHidden || dismissed;

  const required = steps.filter((s) => !s.optional);
  if (hidden || required.every((s) => s.done)) return null;

  const doneCount = steps.filter((s) => s.done).length;
  // Vurgu ilk eksik ZORUNLU adımda: isteğe bağlı bir adım sırayı tutmasın.
  const nextId = required.find((s) => !s.done)?.id;

  function hide() {
    setDismissed(true);
    try {
      localStorage.setItem(HIDE_KEY, "1");
    } catch {
      // Kaydedilemese de bu oturumda gizli kalır.
    }
  }

  return (
    <Card className="gap-0 py-0 shadow-xs">
      <CardHeader className="border-b py-4">
        <CardTitle>Başlangıç rehberi</CardTitle>
        <CardDescription>
          Birkaç adımda sistemi kullanmaya hazır hâle getirin.
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            onClick={hide}
            aria-label="Rehberi gizle"
            title="Rehberi gizle"
            className="-mr-2 -mt-1 text-muted-foreground"
          >
            <X />
          </Button>
        </CardAction>
        <div className="col-span-full mt-2 flex items-center gap-3">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-valuenow={doneCount}
            aria-label="Rehber ilerlemesi"
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-success transition-[width] duration-700"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
          <span className="tabular text-xs text-muted-foreground">
            {doneCount}/{steps.length}
          </span>
        </div>
      </CardHeader>

      <ol className="divide-y">
        {steps.map((step, i) => {
          const next = step.id === nextId;
          return (
            <li
              key={step.id}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5",
                next && "bg-accent/40",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "tabular grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                  step.done
                    ? "bg-success text-success-foreground"
                    : next
                      ? "bg-primary text-primary-foreground"
                      : "border text-muted-foreground",
                )}
              >
                {step.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "flex flex-wrap items-center gap-x-2 text-sm font-medium",
                    step.done && "text-muted-foreground line-through decoration-1",
                  )}
                >
                  {step.title}
                  {step.optional && !step.done && (
                    <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground no-underline">
                      İsteğe bağlı
                    </span>
                  )}
                </p>
                {!step.done && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
                <span className="sr-only">{step.done ? "Tamamlandı" : "Yapılmadı"}</span>
              </div>

              {/* Sıradaki adımın düğmesi dar ekranda metnin altına iniyor:
                  yazılı düğme satırı daraltıp metni sıkıştırıyordu. */}
              {!step.done && (
                <div className={cn("shrink-0", next && "basis-full pl-10 sm:basis-auto sm:pl-0")}>
                  {step.action}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
