import Modal from '@/Components/Modal';

export default function ConfirmModal({
    show,
    title,
    message,
    confirmLabel = 'Hapus',
    cancelLabel = 'Batal',
    onClose,
    onConfirm,
    processing = false,
}: {
    show: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onClose: () => void;
    onConfirm: () => void;
    processing?: boolean;
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="p-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">{title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <button type="button" className="btn-muted" onClick={onClose} disabled={processing}>
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className="btn-muted text-rose-600 dark:text-rose-400"
                        onClick={onConfirm}
                        disabled={processing}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
