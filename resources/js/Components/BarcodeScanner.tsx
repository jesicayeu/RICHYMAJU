import CameraBarcodeScanner from '@/Components/CameraBarcodeScanner';
import { playScanBeep } from '@/hooks/useUsbBarcodeScanner';
import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, ScanLine } from 'lucide-react';

type BarcodeScannerProps = {
    onScan: (barcode: string) => void;
    value?: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    beepOnScan?: boolean;
    debug?: boolean;
    /** Tetap arahkan fokus ke kolom scan (cocok untuk POS). Default: true */
    retainFocus?: boolean;
    /** Kembalikan fokus ke kolom scan setelah berhasil scan. Default: true */
    refocusAfterScan?: boolean;
};

/**
 * Input scan barcode USB — cara paling sederhana & andal.
 * Scanner USB = keyboard: ketik angka + Enter ke kolom ini.
 */
export default function BarcodeScanner({
    onScan,
    value,
    label = 'Scan Barcode',
    placeholder = 'Klik di sini, lalu scan barcode...',
    disabled = false,
    beepOnScan = true,
    debug = false,
    retainFocus = true,
    refocusAfterScan = true,
}: BarcodeScannerProps) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const finishTimer = useRef<ReturnType<typeof setTimeout>>();
    const [displayValue, setDisplayValue] = useState(value ?? '');
    const [lastScan, setLastScan] = useState<string | null>(null);
    const [keyLog, setKeyLog] = useState<string[]>([]);
    const [showCamera, setShowCamera] = useState(false);

    useEffect(() => {
        if (value !== undefined) {
            setDisplayValue(value);
            if (!value) setLastScan(null);
        }
    }, [value]);

    const logKey = (msg: string) => {
        if (!debug) return;
        setKeyLog((prev) => [msg, ...prev].slice(0, 8));
    };

    const canStealFocus = () => {
        const active = document.activeElement;
        if (!active || active === document.body) return true;
        if (active === inputRef.current) return true;

        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false;
        if ((active as HTMLElement).isContentEditable) return false;

        return true;
    };

    const submit = (raw: string) => {
        const barcode = raw.replace(/[\r\n\t]/g, '').trim();
        if (!barcode || barcode.length < 3) return;

        if (beepOnScan) playScanBeep();
        setLastScan(barcode);
        setDisplayValue(barcode);
        logKey(`OK: ${barcode}`);
        onScan(barcode);
        if (refocusAfterScan && canStealFocus()) {
            inputRef.current?.focus();
        }
    };

    const scheduleAutoSubmit = (val: string) => {
        if (finishTimer.current) clearTimeout(finishTimer.current);
        finishTimer.current = setTimeout(() => {
            if (val.trim().length >= 8) {
                submit(val);
            }
        }, 300);
    };

    useEffect(() => {
        if (!retainFocus || disabled) return;

        const focus = () => {
            if (canStealFocus()) {
                inputRef.current?.focus();
            }
        };

        focus();
        const t = window.setInterval(focus, 1000);
        return () => {
            window.clearInterval(t);
        };
    }, [disabled, retainFocus]);

    useEffect(() => {
        return () => {
            if (finishTimer.current) clearTimeout(finishTimer.current);
        };
    }, []);

    return (
        <div className="space-y-3">
            {label ? (
                <label htmlFor={inputId} className="block text-sm font-bold">
                    {label}
                </label>
            ) : null}

            <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => !disabled && setShowCamera(true)}
                        disabled={disabled}
                        className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-indigo-500 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-indigo-900/50"
                        title="Scan dengan kamera"
                        aria-label="Scan dengan kamera"
                    >
                        <ScanLine className="h-5 w-5" />
                    </button>
                    <input
                        id={inputId}
                        ref={inputRef}
                        type="text"
                        name="barcode_scan"
                        className="input w-full !pl-11 !text-xl !font-mono"
                        disabled={disabled}
                        placeholder={placeholder}
                        value={displayValue}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        onChange={(e) => {
                            const val = e.target.value;
                            setDisplayValue(val);
                            logKey(`input: "${val}"`);
                            scheduleAutoSubmit(val);
                        }}
                        onKeyDown={(e) => {
                            logKey(`key: ${e.key} (${e.code})`);
                            if (e.key === 'Enter' || e.key === 'Tab') {
                                e.preventDefault();
                                if (finishTimer.current) clearTimeout(finishTimer.current);
                                submit(displayValue);
                            }
                        }}
                    />
                </div>

                {lastScan && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Terakhir berhasil: <span className="font-mono font-bold">{lastScan}</span>
                    </div>
                )}
            </div>

            {debug && keyLog.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-1 font-bold">Log input (debug):</div>
                    {keyLog.map((line, i) => (
                        <div key={i} className="text-slate-500">
                            {line}
                        </div>
                    ))}
                </div>
            )}

            <CameraBarcodeScanner
                show={showCamera}
                onClose={() => setShowCamera(false)}
                onScan={(barcode) => {
                    if (beepOnScan) playScanBeep();
                    setLastScan(barcode);
                    setDisplayValue(barcode);
                    logKey(`Kamera: ${barcode}`);
                    onScan(barcode);
                }}
            />
        </div>
    );
}
