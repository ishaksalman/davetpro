"use client";

import { CirclePlay, XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

/**
 * Hero'daki "Nasıl çalıştığını görün" bağlantısı: kullanım videosunu
 * pencerede oynatır.
 *
 * Video yalnızca pencere açılınca yükleniyor (`preload="none"` + içerik
 * kapalıyken DOM'da yok); ana sayfanın ilk yüklemesine 9 MB eklemiyor.
 */
export function HeroVideo() {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger className="group inline-flex cursor-pointer items-center gap-2 text-[0.9375rem] font-medium text-white">
        <CirclePlay className="size-5 text-white/45 transition-colors group-hover:text-white" />
        <span className="underline-offset-4 group-hover:underline">
          Nasıl çalıştığını görün
        </span>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[min(1100px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <DialogPrimitive.Title className="sr-only">DavetPro kullanım videosu</DialogPrimitive.Title>
          <div className="overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
            <video
              className="aspect-video w-full"
              src="/video/davetpro-kullanim.mp4"
              poster="/video/davetpro-kullanim-poster.jpg"
              controls
              autoPlay
              playsInline
              preload="none"
            />
          </div>
          <DialogPrimitive.Close
            aria-label="Kapat"
            className="absolute -top-11 right-0 inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <XIcon className="size-5" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
