import ConfirmModal from '@/Components/ConfirmModal';
import { router } from '@inertiajs/react';
import { useCallback, useState, type ReactNode } from 'react';

export type DeleteTarget = {
    id: number;
    label?: string;
};

type Options = {
    buildRoute: (id: number) => string;
    title?: string;
    message: (target: DeleteTarget) => string;
    onSuccess?: () => void;
};

export function useConfirmDelete({ buildRoute, title = 'Konfirmasi Hapus', message, onSuccess }: Options) {
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);

    const requestDelete = useCallback((target: DeleteTarget) => {
        setDeleteTarget(target);
    }, []);

    const closeDelete = useCallback(() => {
        if (!deleteProcessing) {
            setDeleteTarget(null);
        }
    }, [deleteProcessing]);

    const confirmDelete = useCallback(() => {
        if (!deleteTarget) {
            return;
        }

        setDeleteProcessing(true);
        router.delete(buildRoute(deleteTarget.id), {
            onSuccess: () => onSuccess?.(),
            onFinish: () => {
                setDeleteProcessing(false);
                setDeleteTarget(null);
            },
        });
    }, [buildRoute, deleteTarget, onSuccess]);

    const deleteModal: ReactNode = (
        <ConfirmModal
            show={deleteTarget !== null}
            title={title}
            message={deleteTarget ? message(deleteTarget) : ''}
            onClose={closeDelete}
            onConfirm={confirmDelete}
            processing={deleteProcessing}
        />
    );

    return { requestDelete, deleteModal };
}
