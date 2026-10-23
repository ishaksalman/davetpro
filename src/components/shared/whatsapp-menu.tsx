"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { whatsAppLink } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Hazır WhatsApp mesajları menüsü: seçilen metinle sohbet açılır, gönderme
 * kararı kullanıcıda. Tek mesaj varsa menü yerine doğrudan düğme olurdu;
 * burada her zaman en az iki mesaj var (bilgi + hatırlatma).
 */
export function WhatsAppMenu({
  phone,
  messages,
  label = "Müşteriye mesaj gönder",
  className,
}: {
  phone: string | null | undefined;
  messages: { key: string; label: string; text: string }[];
  label?: string;
  className?: string;
}) {
  if (!whatsAppLink(phone) || messages.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#1da851]",
            className,
          )}
        >
          <WhatsAppIcon />
          <span>{label}</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Hazır mesaj</DropdownMenuLabel>
        {messages.map((m) => (
          <DropdownMenuItem key={m.key} asChild>
            <a
              href={whatsAppLink(phone, m.text) ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              {m.label}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
