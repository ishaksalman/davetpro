"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
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
