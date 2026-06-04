import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

type PasswordInputProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    autoComplete?: string;
};

export default function PasswordInput({
    value,
    onChange,
    placeholder,
    className = 'input w-full',
    autoComplete = 'off',
}: PasswordInputProps) {
    const [show, setShow] = useState(false);

    return (
        <div className="relative">
            <input
                type="text"
                inputMode="text"
                className={`${className} !pr-10 ${show ? '' : 'input-masked'}`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                spellCheck={false}
            />
            <button
                type="button"
                onClick={() => setShow((current) => !current)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={show ? 'Sembunyikan' : 'Tampilkan'}
            >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    );
}
