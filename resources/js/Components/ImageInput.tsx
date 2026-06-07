import CameraCapture from '@/Components/CameraCapture';
import InputError from '@/Components/InputError';
import { Camera, ImagePlus } from 'lucide-react';
import { ChangeEvent, ReactNode, useRef, useState } from 'react';

type ImageInputProps = {
    accept?: string;
    onChange: (file: File) => void;
    error?: string;
    facingMode?: 'user' | 'environment';
    pickLabel?: string;
    cameraLabel?: string;
    pickTitle?: string;
    cameraTitle?: string;
    children?: ReactNode;
    variant?: 'buttons' | 'compact';
    disabled?: boolean;
};

export default function ImageInput({
    accept = 'image/jpeg,image/jpg,image/png,image/webp',
    onChange,
    error,
    facingMode = 'environment',
    pickLabel = 'Pilih Foto',
    cameraLabel = 'Ambil Foto',
    pickTitle = 'Pilih dari galeri',
    cameraTitle = 'Ambil foto langsung',
    children,
    variant = 'buttons',
    disabled = false,
}: ImageInputProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showCamera, setShowCamera] = useState(false);

    const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onChange(file);
        e.target.value = '';
    };

    const compactButtonClass =
        'btn-muted inline-flex items-center justify-center !rounded-xl !p-3 disabled:pointer-events-none disabled:opacity-50';
    const buttonClass = variant === 'compact' ? compactButtonClass : 'btn-primary !py-2';

    return (
        <>
            {children}

            <div
                className={
                    variant === 'compact'
                        ? 'inline-flex items-center gap-2'
                        : 'flex flex-wrap justify-center gap-2 sm:justify-start'
                }
            >
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={buttonClass}
                    disabled={disabled}
                    title={pickTitle}
                >
                    <ImagePlus className={variant === 'compact' ? 'h-5 w-5' : 'h-4 w-4'} />
                    {variant === 'buttons' ? pickLabel : null}
                </button>
                <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className={buttonClass}
                    disabled={disabled}
                    title={cameraTitle}
                >
                    <Camera className={variant === 'compact' ? 'h-5 w-5' : 'h-4 w-4'} />
                    {variant === 'buttons' ? cameraLabel : null}
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={onPickFile}
                disabled={disabled}
            />

            <InputError message={error} className="mt-2" />

            <CameraCapture
                show={showCamera}
                onClose={() => setShowCamera(false)}
                onCapture={onChange}
                facingMode={facingMode}
            />
        </>
    );
}
