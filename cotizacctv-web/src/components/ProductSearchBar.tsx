"use client";

import * as React from "react";
import { Product } from "@/types";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

// ── Accent-insensitive helper ──────────────────────────────────────────────
function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

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
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const debouncedSearchTerm = useDebounce(inputValue, 300);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  // ── Filter products with accent-insensitive matching ──────────────────────
  const filteredProducts = React.useMemo(() => {
    const q = normalize(debouncedSearchTerm);
    if (!q) return products.slice(0, 50);
    return products
      .filter((p) => normalize(p.name).includes(q) || normalize(p.sku).includes(q))
      .slice(0, 50);
  }, [products, debouncedSearchTerm]);

  // ── Reset highlight when results change ───────────────────────────────────
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [debouncedSearchTerm]);

  // ── Close dropdown when clicking outside ──────────────────────────────────
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Scroll highlighted item into view ─────────────────────────────────────
  React.useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const handleSelect = (product: Product) => {
    onSelect(product);
    setInputValue("");
    setOpen(false);
    setHighlightedIndex(-1);
    // Return focus immediately — no setTimeout race
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filteredProducts.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
          handleSelect(filteredProducts[highlightedIndex]);
        } else if (filteredProducts.length === 1) {
          handleSelect(filteredProducts[0]);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  return (
    // ── Wrapper — relative so the dropdown positions against it ──────────────
    <div ref={containerRef} className="relative w-full">
      {/* ── Search input ─────────────────────────────────────────────────── */}
      <div
        className={`flex items-center gap-3 w-full border-2 rounded-xl px-4 py-2.5 transition-all ${
          disabled
            ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
            : open
            ? "border-emerald-500 bg-white ring-4 ring-emerald-500/10"
            : "border-emerald-200 bg-emerald-50 hover:border-emerald-400 focus-within:border-emerald-500"
        }`}
      >
        <Search className="h-4 w-4 text-emerald-500 shrink-0" />
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isLoading
              ? "Cargando catálogo..."
              : "Buscar por nombre o SKU (sin acentos también)..."
          }
          disabled={isLoading || disabled}
          autoComplete="off"
          className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 font-medium"
        />
        {inputValue && (
          <button
            type="button"
            // mouseDown + preventDefault to keep focus in input
            onMouseDown={(e) => {
              e.preventDefault();
              setInputValue("");
              setOpen(true);
              inputRef.current?.focus();
            }}
            className="text-slate-300 hover:text-slate-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Dropdown ─────────────────────────────────────────────────────── */}
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-slate-400">
              Cargando catálogo...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">
              {debouncedSearchTerm
                ? `Sin resultados para "${debouncedSearchTerm}".`
                : "Comienza a escribir para buscar..."}
            </div>
          ) : (
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-72 overflow-y-auto py-1"
            >
              {filteredProducts.map((product, index) => (
                <li
                  key={product.id}
                  role="option"
                  aria-selected={highlightedIndex === index}
                  // mouseDown + preventDefault is the KEY fix:
                  // prevents the input from blurring before the click fires
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(product)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex items-center justify-between gap-4 px-3 py-2.5 cursor-pointer transition-colors ${
                    highlightedIndex === index
                      ? "bg-emerald-50 text-emerald-900"
                      : "hover:bg-slate-50"
                  }`}
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
                    Q{product.calculated_sale_price.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
