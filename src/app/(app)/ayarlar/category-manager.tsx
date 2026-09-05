"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { ExpenseCategory } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { deleteExpenseCategory, saveExpenseCategory } from "../giderler/actions";

/**
 * Gider kategorileri satır içi düzenlenir — ayrı bir form penceresi açmak
 * bu kadar basit bir kayıt için gereksiz sürtünme yaratır.
 */
export function CategoryManager({ categories }: { categories: ExpenseCategory[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  function save(input: { id?: string; name: string; is_active: boolean }) {
    if (input.name.trim().length === 0) return;
    startTransition(async () => {
      const result = await saveExpenseCategory(input);
      if (result.ok) {
        toast.success(input.id ? "Kategori güncellendi." : "Kategori eklendi.");
        setEditingId(null);
        if (!input.id) setNewName("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="max-w-xl space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save({ name: newName, is_active: true });
        }}
        className="flex gap-2"
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Yeni kategori adı"
          aria-label="Yeni kategori adı"
        />
        <Button type="submit" disabled={pending || newName.trim().length === 0}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />}
          Ekle
        </Button>
      </form>

      <ul className="divide-y rounded-xl border bg-card">
        {categories.map((category) => (
          <li
            key={category.id}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5",
              !category.is_active && "opacity-60",
            )}
          >
            {editingId === category.id ? (
              <>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="h-10"
                  autoFocus
                  aria-label="Kategori adı"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-10"
                  disabled={pending}
                  onClick={() =>
                    save({
                      id: category.id,
                      name: draft,
                      is_active: category.is_active,
                    })
                  }
                  aria-label="Kaydet"
                >
                  <Check />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-10"
                  onClick={() => setEditingId(null)}
                  aria-label="Vazgeç"
                >
                  <X />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{category.name}</span>

                <Switch
                  checked={category.is_active}
                  disabled={pending}
                  onCheckedChange={(checked) =>
                    save({
                      id: category.id,
                      name: category.name,
                      is_active: checked,
                    })
                  }
                  aria-label={`${category.name} kategorisini ${category.is_active ? "pasifleştir" : "aktifleştir"}`}
                />

                <Button
                  size="icon"
                  variant="ghost"
                  className="size-10"
                  onClick={() => {
                    setEditingId(category.id);
                    setDraft(category.name);
                  }}
                  aria-label="Düzenle"
                >
                  <Pencil />
                </Button>

                <ConfirmDialog
                  title="Kategori silinsin mi?"
                  description={
                    <>
                      <strong>{category.name}</strong> silinecek. Bu kategoride gider
                      kaydı varsa silinemez — bunun yerine pasife alabilirsiniz.
                    </>
                  }
                  confirmLabel="Sil"
                  successMessage="Kategori silindi."
                  onConfirm={() => deleteExpenseCategory(category.id)}
                  trigger={
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-10 text-muted-foreground hover:text-destructive"
                      aria-label="Sil"
                    >
                      <Trash2 />
                    </Button>
                  }
                />
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
