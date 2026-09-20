"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeSearch } from "@/lib/vehicle-selection";

export interface SearchOption {
  id: string;
  label: string;
  description?: string;
  keywords?: string;
}

export function SearchPicker({
  label,
  placeholder,
  options,
  value,
  onSelect,
  disabled,
  compact = false,
  emptyMessage = "一致する候補がありません。短い名前や別の表記でお試しください。",
}: {
  label: string;
  placeholder: string;
  options: SearchOption[];
  value?: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
  compact?: boolean;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.id === value);
  const matches = useMemo(() => {
    const query = normalizeSearch(search);
    return options.filter((option) =>
      normalizeSearch(
        `${option.label} ${option.description ?? ""} ${option.keywords ?? ""}`,
      ).includes(query),
    );
  }, [options, search]);
  return (
    <div className="min-w-0">
      <p className={compact ? "sr-only" : "mb-2 text-xs font-bold text-muted-foreground"}>{label}</p>
      <Button
        variant={compact ? "ghost" : "outline"}
        disabled={disabled}
        onClick={() => {
          setSearch("");
          setOpen(true);
        }}
        aria-label={`${label}: ${selected?.label ?? placeholder}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={compact ? "size-11 rounded-xl p-0" : "h-auto min-h-14 w-full justify-between gap-3 rounded-xl bg-white px-4 py-3 text-left whitespace-normal"}
      >
        {compact ? <Search className="size-5" /> : <>
        <span className="min-w-0">
          <span
            className={
              selected ? "block font-bold" : "block text-muted-foreground"
            }
          >
            {selected?.label ?? placeholder}
          </span>
          {selected?.description && (
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              {selected.description}
            </span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </>}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85dvh] flex-col gap-4 rounded-2xl p-5 sm:max-w-lg">
          <div className="pr-10">
            <DialogTitle className="text-xl font-bold">{label}</DialogTitle>
            <DialogDescription className="mt-2">
              名前を入力して候補を絞り込めます。
            </DialogDescription>
          </div>
          <div className="relative">
            <Search className="absolute top-4 left-3 size-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={`${label}を検索`}
              placeholder={placeholder}
              className="h-12 rounded-xl pl-10 text-base"
            />
          </div>
          <p role="status" className="text-xs text-muted-foreground">
            {matches.length}件
            {matches.length > 50 && " · 先頭50件を表示しています"}
          </p>
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {matches.length === 0 ? (
              <p className="py-8 text-sm leading-7 text-muted-foreground">
                {emptyMessage}
              </p>
            ) : (
              <ul className="space-y-1">
                {matches.slice(0, 50).map((option) => (
                  <li key={option.id}>
                    <Button
                      variant="ghost"
                      className="h-auto min-h-14 w-full justify-between rounded-xl px-3 py-3 text-left whitespace-normal"
                      onClick={() => {
                        onSelect(option.id);
                        setOpen(false);
                      }}
                    >
                      <span>
                        <span className="block font-bold">{option.label}</span>
                        {option.description && (
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </span>
                      {option.id === value && (
                        <Check className="size-4 text-primary" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
