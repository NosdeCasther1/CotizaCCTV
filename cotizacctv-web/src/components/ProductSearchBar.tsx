"use client";

import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Product } from "@/types";
import { Search } from "lucide-react";

interface ProductSearchBarProps {
  products: Product[];
  onSelect: (product: Product) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ProductSearchBar({
  products,
  onSelect,
  isLoading = false,
  disabled = false,
}: ProductSearchBarProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSelect = (product: Product) => {
    onSelect(product);
    // Reset immediately so the user can search for the next item
    setInputValue("");
    setOpen(false);
    // Keep focus on the input for rapid entry
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* We use a styled div as the trigger so we fully control the input */}
        <div
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`flex items-center gap-3 w-full border-2 rounded-xl px-4 py-2.5 transition-all ${
            disabled
              ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
              : "cursor-text border-emerald-200 bg-emerald-50 hover:border-emerald-400 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10"
          }`}
          onClick={() => {
            if (disabled) return;
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          <Search className="h-4 w-4 text-emerald-500 shrink-0" />
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={
              isLoading
                ? "Cargando catálogo..."
                : "Buscar producto por nombre o SKU y presionar Enter para agregar..."
            }
            disabled={isLoading || disabled}
            className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 font-medium"
          />
          {inputValue && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setInputValue("");
              }}
              className="text-slate-300 hover:text-slate-500 transition-colors text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 shadow-xl border-slate-200"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        align="start"
        sideOffset={6}
      >
        <Command shouldFilter={false}>
          {/* Hidden CommandInput to drive filtering — we manage it ourselves */}
          <CommandInput
            value={inputValue}
            onValueChange={setInputValue}
            className="hidden"
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {inputValue.length > 0
                ? "No se encontraron productos."
                : "Escribe para buscar..."}
            </CommandEmpty>
            <CommandGroup>
              {products
                .filter((p) => {
                  if (!inputValue) return true;
                  const q = inputValue.toLowerCase();
                  return (
                    p.name.toLowerCase().includes(q) ||
                    p.sku.toLowerCase().includes(q)
                  );
                })
                .slice(0, 50)
                .map((product) => (
                  <CommandItem
                    key={product.id}
                    value={`${product.sku} ${product.name}`}
                    onSelect={() => handleSelect(product)}
                    className="flex items-center justify-between gap-4 py-2.5 px-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                        {product.sku}
                      </span>
                      <span className="text-sm text-slate-800 truncate font-medium">
                        {product.name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 shrink-0">
                      Q{product.calculated_sale_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
