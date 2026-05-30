import AppLayout from '@/Layouts/AppLayout';
import { dateTime } from '@/lib/format';
import { router } from '@inertiajs/react';
import { Bell, CheckCircle2 } from 'lucide-react';

export default function NotificationsIndex({ notifications }: any) {
    return (
        <AppLayout title="Notifikasi">
            <div className="glass-card mx-auto max-w-4xl overflow-hidden">
                <div className="p-6"><h2 className="flex items-center gap-2 text-xl font-black"><Bell className="h-5 w-5 text-indigo-500" /> Daftar Notifikasi</h2></div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.data.map((notification: any) => (
                        <div key={notification.id} className="flex items-center justify-between gap-4 p-5">
                            <div>
                                <div className="font-bold">{notification.data?.title ?? 'Notifikasi sistem'}</div>
                                <div className="text-sm text-slate-500">{notification.data?.message ?? JSON.stringify(notification.data)} - {dateTime(notification.created_at)}</div>
                            </div>
                            {!notification.read_at && <button onClick={() => router.post(route('notifications.read', notification.id))} className="btn-muted"><CheckCircle2 className="h-4 w-4" /> Baca</button>}
                        </div>
                    ))}
                    {!notifications.data.length && <div className="p-8 text-center text-slate-500">Belum ada notifikasi.</div>}
                </div>
            </div>
        </AppLayout>
    );
}
