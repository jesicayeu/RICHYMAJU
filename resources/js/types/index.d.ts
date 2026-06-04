export interface User {
    id: number;
    username: string;
    name: string;
    display_name?: string;
    email?: string;
    phone?: string | null;
    role: 'admin' | 'kasir';
    status: 'aktif' | 'nonaktif';
    avatar_url?: string;
    email_verified_at?: string;
}

export interface UserPresence {
    id: number;
    is_online: boolean;
    last_login_at?: string | null;
    last_seen_at?: string | null;
}

export interface UserPresence {
    id: number;
    is_online: boolean;
    last_login_at?: string | null;
    last_seen_at?: string | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    flash?: {
        success?: string;
        error?: string;
        encryption_tab?: 'text' | 'file';
        whatsapp_tab?: 'config' | 'pesan' | 'kontak' | 'tes';
    };
    unreadNotifications?: number;
};
