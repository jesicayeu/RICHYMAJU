import { formatQuantity, rupiah } from '@/lib/format';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type SearchableProduct = {
    id: number;
    barcode: string;
    name: string;
    unit: string;
    sell_price: number;
    stock: number;
};

type DropdownRect = {
    top: number;
    left: number;
    width: number;
};

type ProductSearchComboboxProps = {
    products: SearchableProduct[];
    onSelect: (product: SearchableProduct) => void;
    onBarcodeScan?: (barcode: string) => void;
    disabled?: boolean;
    placeholder?: string;
    /** Posisi daftar opsi relatif terhadap input */
    placement?: 'top' | 'bottom';
};

export default function ProductSearchCombobox({
    products,
    onSelect,
    onBarcodeScan,
    disabled = false,
    placeholder = 'Cari nama atau barcode produk...',
    placement = 'bottom',
}: ProductSearchComboboxProps) {
    const inputId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const barcodeTimer = useRef<ReturnType<typeof setTimeout>>();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);

    const filteredProducts = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return [];

        return products
            .filter(
                (product) =>
                    product.name.toLowerCase().includes(term) ||
                    product.barcode.toLowerCase().includes(term),
            )
            .slice(0, 8);
    }, [products, query]);

    const closeList = useCallback(() => {
        setOpen(false);
        setActiveIndex(0);
        setDropdownRect(null);
    }, []);

    const clearQuery = () => {
        setQuery('');
        closeList();
    };

    const pickProduct = (product: SearchableProduct) => {
        onSelect(product);
        clearQuery();
        inputRef.current?.focus();
    };

    const tryBarcodeScan = (raw: string) => {
        const barcode = raw.replace(/[\r\n\t]/g, '').trim();
        if (!barcode || barcode.length < 3 || !onBarcodeScan) return;
        onBarcodeScan(barcode);
        clearQuery();
    };

    const scheduleBarcodeScan = (value: string) => {
        if (!onBarcodeScan) return;
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);

        const trimmed = value.trim();
        if (trimmed.length < 8 || !/^\d+$/.test(trimmed)) return;

        barcodeTimer.current = setTimeout(() => {
            tryBarcodeScan(trimmed);
        }, 80);
    };

    const updateDropdownRect = useCallback(() => {
        const input = inputRef.current;
        if (!input) return;

        const rect = input.getBoundingClientRect();
        const gap = 8;

        setDropdownRect({
            left: rect.left,
            width: rect.width,
            top: placement === 'bottom' ? rect.bottom + gap : Math.max(gap, rect.top - gap - 256),
        });
    }, [placement]);

    useEffect(() => {
        if (!open || !query.trim()) {
            setDropdownRect(null);
            return;
        }

        updateDropdownRect();

        const onLayoutChange = () => updateDropdownRect();
        window.addEventListener('resize', onLayoutChange);
        window.addEventListener('scroll', onLayoutChange, true);

        return () => {
            window.removeEventListener('resize', onLayoutChange);
            window.removeEventListener('scroll', onLayoutChange, true);
        };
    }, [open, query, updateDropdownRect]);

    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
            closeList();
        };

        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [closeList]);

    useEffect(() => {
        return () => {
            if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        };
    }, []);

    useEffect(() => {
        if (activeIndex >= filteredProducts.length) {
            setActiveIndex(0);
        }
    }, [activeIndex, filteredProducts.length]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open && filteredProducts.length > 0) setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, filteredProducts.length - 1));
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            closeList();
            return;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            if (barcodeTimer.current) clearTimeout(barcodeTimer.current);

            if (open && filteredProducts[activeIndex]) {
                pickProduct(filteredProducts[activeIndex]);
                return;
            }

            const exact = products.find((product) => product.barcode === query.trim());
            if (exact) {
                pickProduct(exact);
                return;
            }

            tryBarcodeScan(query);
        }
    };

    const dropdown =
        open && query.trim() && dropdownRect
            ? createPortal(
                  <ul
                      ref={listRef}
                      id={`${inputId}-listbox`}
                      role="listbox"
                      style={{
                          position: 'fixed',
                          top: dropdownRect.top,
                          left: dropdownRect.left,
                          width: dropdownRect.width,
                      }}
                      className="product-search-dropdown z-[250] max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                  >
                      {filteredProducts.length === 0 ? (
                          <li className="px-4 py-3 text-sm text-slate-400">Produk tidak ditemukan.</li>
                      ) : (
                          filteredProducts.map((product, index) => (
                              <li key={product.id} role="option" aria-selected={index === activeIndex}>
                                  <button
                                      type="button"
                                      disabled={disabled || product.stock <= 0}
                                      onMouseDown={(event) => event.preventDefault()}
                                      onClick={() => pickProduct(product)}
                                      className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                          index === activeIndex
                                              ? 'bg-indigo-50 dark:bg-indigo-950/40'
                                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                      }`}
                                  >
                                      <div className="min-w-0">
                                          <div className="truncate font-bold">{product.name}</div>
                                          <div className="mt-0.5 font-mono text-xs text-slate-500">{product.barcode}</div>
                                      </div>
                                      <div className="shrink-0 text-right">
                                          <div className="font-black tabular-nums text-indigo-600 dark:text-indigo-300">
                                              {rupiah(product.sell_price)}
                                          </div>
                                          <div className="mt-0.5 text-xs text-slate-500">
                                              Stok: {formatQuantity(product.stock, product.unit)}
                                          </div>
                                      </div>
                                  </button>
                              </li>
                          ))
                      )}
                  </ul>,
                  document.body,
              )
            : null;

    return (
        <>
            <div ref={rootRef} className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-400" />
                <input
                    id={inputId}
                    ref={inputRef}
                    type="search"
                    className="input w-full !pl-10 !text-base"
                    disabled={disabled}
                    placeholder={placeholder}
                    value={query}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={`${inputId}-listbox`}
                    aria-autocomplete="list"
                    onChange={(event) => {
                        const next = event.target.value;
                        setQuery(next);
                        setOpen(next.trim().length > 0);
                        setActiveIndex(0);
                        scheduleBarcodeScan(next);
                    }}
                    onFocus={() => {
                        if (query.trim()) setOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                />
            </div>
            {dropdown}
        </>
    );
}
