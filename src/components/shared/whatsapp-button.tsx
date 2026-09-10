"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { whatsAppLink } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Müşteriye tek tıkla WhatsApp'tan yazmak için.
 *
 * `label` hem erişilebilirlik adı hem de görünen metin (yalnızca size="sm").
 * Simge biçiminde metin yok, ipucu olarak gösteriliyor.
 */
export function WhatsAppButton({
  phone,
  message,
  className,
  size = "icon",
  label = "WhatsApp'tan yaz",
}: {
  phone: string | null | undefined;
  message?: string;
  className?: string;
  size?: "icon" | "sm";
  label?: string;
}) {
  const href = whatsAppLink(phone, message);
  if (!href) return null;

  const button = (
    <Button
      asChild
      variant="ghost"
      size={size}
      className={cn(
        "text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#1da851]",
        className,
      )}
    >
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
        <WhatsAppIcon />
        {size !== "icon" && <span>{label}</span>}
      </a>
    </Button>
  );

  if (size !== "icon") return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35Z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 0 0 4.78 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Z" />
    </svg>
  );
}
