import ConfirmModal from '@/Components/ConfirmModal';
import AppLayout from '@/Layouts/AppLayout';
import { dateTime, dateTimeNoSeconds } from '@/lib/format';
import { useEcho } from '@laravel/echo-react';
import { useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Check, CheckCheck, ChevronLeft, ImagePlus, Search, Send, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { PageProps, User, UserPresence } from '@/types';

type ChatMessagePayload = { message: any };

type ConversationItem = {
    id: number | null;
    other: MessageUser;
    lastMessage?: any;
};

type PresenceFields = {
    is_online?: boolean;
    last_login_at?: string | null;
    last_seen_at?: string | null;
};

type MessageUser =
    | (Pick<User, 'id' | 'avatar_url' | 'display_name' | 'name' | 'username' | 'role'> & PresenceFields)
    | null
    | undefined;

type ContactUser = MessageUser & { role?: string };

function mergePresence<T extends { id?: number } & PresenceFields>(
    user: T | null | undefined,
    presenceByUserId: Record<number, UserPresence>,
): T | null | undefined {
    if (!user?.id) return user;
    const patch = presenceByUserId[user.id];
    if (!patch) return user;
    return { ...user, ...patch };
}

function buildPresenceMap(users: Array<{ id?: number } & PresenceFields>): Record<number, UserPresence> {
    const map: Record<number, UserPresence> = {};
    users.forEach((user) => {
        if (!user?.id) return;
        map[user.id] = {
            id: user.id,
            is_online: Boolean(user.is_online),
            last_login_at: user.last_login_at ?? null,
            last_seen_at: user.last_seen_at ?? null,
        };
    });
    return map;
}

function contactLabel(user?: ContactUser | null): string {
    return user?.display_name || user?.name || user?.username || '';
}

function matchesQuery(text: string | undefined | null, query: string): boolean {
    if (!query) return true;
    return (text ?? '').toLowerCase().includes(query);
}

function userMatchesQuery(user: ContactUser | null | undefined, query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    return [user?.display_name, user?.name, user?.username].some((v) => (v ?? '').toLowerCase().includes(q));
}

function isChatImageAttachment(name?: string | null, url?: string | null): boolean {
    const s = (name || url || '').toLowerCase();
    return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(s);
}

function ChatAvatar({
    user,
    className = 'h-10 w-10',
    showPresence = false,
}: {
    user?: MessageUser;
    className?: string;
    showPresence?: boolean;
}) {
    const label = user?.display_name || user?.name || user?.username || '?';
    const initial = label.charAt(0).toUpperCase();
    const rounded = className.includes('rounded') ? '' : 'rounded-xl';
    const avatar = user?.avatar_url ? (
        <img
            src={user.avatar_url}
            alt={label}
            className={`${className} ${rounded} object-cover shadow-md shadow-indigo-500/15`}
        />
    ) : (
        <div
            className={`grid ${className} ${rounded} place-items-center bg-indigo-600 text-sm font-black text-white shadow-md shadow-indigo-500/20`}
        >
            {initial}
        </div>
    );

    return (
        <div className="relative shrink-0">
            {avatar}
            {showPresence ? (
                <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                        user?.is_online ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                    title={user?.is_online ? 'Online' : 'Offline'}
                />
            ) : null}
        </div>
    );
}

function UserPresenceInfo({ user }: { user: MessageUser }) {
    if (!user) return null;

    return (
        <div className="mt-1 space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs">
                <span className={`h-2 w-2 shrink-0 rounded-full ${user.is_online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span
                    className={
                        user.is_online
                            ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                            : 'font-medium text-slate-500 dark:text-slate-400'
                    }
                >
                    {user.is_online ? 'Online' : 'Offline'}
                </span>
            </div>
            {!user.is_online && user.last_login_at ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Login terakhir: {dateTimeNoSeconds(user.last_login_at)}
                </p>
            ) : null}
        </div>
    );
}

function MessageAttachmentBlock({ message, mine }: { message: any; mine: boolean }) {
    const url = message.attachment_url as string | undefined | null;
    if (!url) return null;
    const name = message.attachment_original_name as string | undefined | null;
    const isImage = isChatImageAttachment(name, url);
    if (isImage) {
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-indigo-400">
                <img src={url} alt={name || 'Lampiran gambar'} className="max-h-64 max-w-full rounded-2xl object-contain" />
            </a>
        );
    }
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 inline-flex max-w-full items-center gap-2 break-all rounded-xl px-3 py-2 text-sm font-semibold underline ${
                mine ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
            }`}
        >
            📄 <span className="truncate">{name || 'Unduh berkas'}</span>
        </a>
    );
}

function appendMessages(current: any[], incoming: any[]): any[] {
    if (!incoming.length) return current;
    const ids = new Set(current.map((m) => m.id));
    const next = incoming.filter((m) => !ids.has(m.id));
    return next.length ? [...current, ...next] : current;
}

type ReadReceipt = { id: number; read_at: string | null };

function applyReadReceipts(messages: any[], receipts: ReadReceipt[]): any[] {
    if (!receipts.length) return messages;
    const readById = new Map(
        receipts.filter((r) => r.read_at).map((r) => [r.id, r.read_at as string]),
    );
    if (readById.size === 0) return messages;

    return messages.map((m) => {
        const readAt = readById.get(m.id);
        return readAt ? { ...m, read_at: readAt } : m;
    });
}

function MessageReadReceipt({ readAt, mine }: { readAt?: string | null; mine: boolean }) {
    if (!mine) return null;

    const isRead = Boolean(readAt);

    return (
        <span
            className="ml-1.5 inline-flex shrink-0 items-center gap-0.5"
            title={isRead ? 'Sudah dilihat' : 'Terkirim, belum dilihat'}
            aria-label={isRead ? 'Sudah dilihat' : 'Terkirim, belum dilihat'}
        >
            {isRead ? (
                <CheckCheck className="h-[18px] w-[18px] text-sky-100 drop-shadow-sm" strokeWidth={2.75} aria-hidden />
            ) : (
                <Check className="h-[18px] w-[18px] text-white drop-shadow-sm" strokeWidth={2.75} aria-hidden />
            )}
        </span>
    );
}

function parseIncomingMessage(payload: ChatMessagePayload | any): any | null {
    const message = payload?.message ?? payload;
    if (message && typeof message === 'object' && 'id' in message) {
        return message;
    }
    return null;
}

function conversationLastPreview(lastMessage: any | undefined): string {
    if (!lastMessage) return 'Mulai percakapan';
    if (lastMessage.body && String(lastMessage.body).trim() !== '') return lastMessage.body;
    if (lastMessage.attachment_url) return `📎 ${lastMessage.attachment_original_name || 'Lampiran'}`;
    return 'Pesan';
}

function sortConversations(items: ConversationItem[]): ConversationItem[] {
    return [...items].sort((a, b) => {
        const at = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
        const bt = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
        return bt - at;
    });
}

const DELETE_ACTION_WIDTH = 64;
const SWIPE_START_THRESHOLD_PX = 10;

function useChatMobileLayout() {
    const [isNarrow, setIsNarrow] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
    );

    useEffect(() => {
        const media = window.matchMedia('(max-width: 1023px)');
        const onChange = () => setIsNarrow(media.matches);
        onChange();
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, []);

    return isNarrow;
}

function ConversationListRow({
    children,
    open,
    onOpenChange,
    onDelete,
    onSelect,
    deleting = false,
}: {
    children: ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete: () => void;
    onSelect: () => void;
    deleting?: boolean;
}) {
    const [reveal, setReveal] = useState(open ? DELETE_ACTION_WIDTH : 0);
    const [isDragging, setIsDragging] = useState(false);
    const rowRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef({ startX: 0, startY: 0, startReveal: 0, dragging: false });

    useEffect(() => {
        setReveal(open ? DELETE_ACTION_WIDTH : 0);
    }, [open]);

    useEffect(() => {
        const row = rowRef.current;
        if (!row) return;

        const onTouchMove = (e: TouchEvent) => {
            if (!dragRef.current.dragging) return;
            e.preventDefault();
        };

        row.addEventListener('touchmove', onTouchMove, { passive: false });
        return () => row.removeEventListener('touchmove', onTouchMove);
    }, []);

    const clampReveal = (value: number) => Math.max(0, Math.min(DELETE_ACTION_WIDTH, value));

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (deleting || (e.target as HTMLElement).closest('[data-delete-action]')) {
            return;
        }
        dragRef.current = { startX: e.clientX, startY: e.clientY, startReveal: reveal, dragging: false };
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        const deltaX = drag.startX - e.clientX;
        const deltaY = Math.abs(e.clientY - drag.startY);

        if (!drag.dragging) {
            if (Math.abs(deltaX) < SWIPE_START_THRESHOLD_PX || Math.abs(deltaX) <= deltaY) {
                return;
            }
            drag.dragging = true;
            setIsDragging(true);
            onOpenChange(false);
            e.currentTarget.setPointerCapture(e.pointerId);
        }

        if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
            return;
        }

        setReveal(clampReveal(drag.startReveal + deltaX));
    };

    const finishPointer = (e: React.PointerEvent<HTMLDivElement>) => {
        const wasDragging = dragRef.current.dragging;
        dragRef.current.dragging = false;
        setIsDragging(false);

        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }

        if (wasDragging) {
            setReveal((current) => {
                const shouldOpen = current > DELETE_ACTION_WIDTH / 2;
                onOpenChange(shouldOpen);
                return shouldOpen ? DELETE_ACTION_WIDTH : 0;
            });
            return;
        }

        onSelect();
    };

    const showDelete = reveal > 0;

    return (
        <div ref={rowRef} className="relative overflow-hidden rounded-2xl">
            <div
                className="absolute inset-y-0 right-0 flex items-center justify-center bg-rose-600"
                style={{
                    width: DELETE_ACTION_WIDTH,
                    clipPath: showDelete
                        ? `inset(0 ${Math.max(0, DELETE_ACTION_WIDTH - reveal)}px 0 0)`
                        : 'inset(0 100% 0 0)',
                    pointerEvents: reveal >= DELETE_ACTION_WIDTH / 2 ? 'auto' : 'none',
                }}
                aria-hidden={!showDelete}
            >
                <button
                    type="button"
                    data-delete-action
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete();
                    }}
                    disabled={deleting}
                    className="flex h-full w-full items-center justify-center text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-60"
                    aria-label="Hapus chat"
                    title="Hapus chat"
                    tabIndex={showDelete ? 0 : -1}
                >
                    <Trash2 className="h-5 w-5 shrink-0" />
                </button>
            </div>
            <div
                className={`relative z-10 w-full touch-pan-y select-none will-change-transform ${
                    isDragging ? '' : 'transition-transform duration-200 ease-out'
                }`}
                style={{ transform: `translateX(-${reveal}px)` }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={finishPointer}
                onPointerCancel={finishPointer}
            >
                {children}
            </div>
        </div>
    );
}

type MessageReadPayload = {
    conversation_id: number;
    message_ids: number[];
    read_at: string;
};

function ChatConversationListener({
    conversationId,
    onMessage,
    onRead,
}: {
    conversationId: number;
    onMessage: (conversationId: number, message: any) => void;
    onRead: (conversationId: number, payload: MessageReadPayload) => void;
}) {
    useEcho<ChatMessagePayload>(
        `conversation.${conversationId}`,
        '.MessageSent',
        (payload) => {
            const message = parseIncomingMessage(payload);
            if (message) onMessage(conversationId, message);
        },
        [conversationId],
    );

    useEcho<MessageReadPayload>(
        `conversation.${conversationId}`,
        '.MessageRead',
        (payload) => {
            if (payload?.conversation_id && payload.message_ids?.length) {
                onRead(conversationId, payload);
            }
        },
        [conversationId],
    );

    return null;
}

export default function ChatIndex({ conversations, activeConversation, contacts = [] }: any) {
    const { auth } = usePage<PageProps>().props;
    const isNarrowScreen = useChatMobileLayout();
    const [mobileInChat, setMobileInChat] = useState(false);

    const [conversationItems, setConversationItems] = useState<ConversationItem[]>(() =>
        sortConversations(conversations ?? []),
    );
    const [activeId, setActiveId] = useState<number | null>(activeConversation?.id ?? null);
    const [pendingRecipient, setPendingRecipient] = useState<ContactUser | null>(null);
    const [messages, setMessages] = useState<any[]>(activeConversation?.messages ?? []);
    const [unread, setUnread] = useState<Record<number, number>>({});
    const [sidebarQuery, setSidebarQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastMessageIdRef = useRef(0);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteConversationTarget, setDeleteConversationTarget] = useState<{ id: number; label: string } | null>(
        null,
    );
    const [deleteConversationProcessing, setDeleteConversationProcessing] = useState(false);
    const [openSwipeId, setOpenSwipeId] = useState<number | null>(null);
    const [presenceByUserId, setPresenceByUserId] = useState<Record<number, UserPresence>>(() => {
        const fromConversations = (conversations ?? [])
            .map((item: ConversationItem) => item.other)
            .filter(Boolean) as Array<{ id: number } & PresenceFields>;
        return buildPresenceMap([...fromConversations, ...(contacts ?? [])]);
    });

    const form = useForm({
        conversation_id: activeConversation?.id ?? '',
        recipient_id: '' as number | '',
        body: '',
        context_type: '',
        context_id: '',
        attachment: null as File | null,
    });

    const activeItem = useMemo(
        () => conversationItems.find((c) => c.id === activeId) ?? null,
        [conversationItems, activeId],
    );

    const otherUser = useMemo(
        () => mergePresence(activeItem?.other ?? pendingRecipient ?? null, presenceByUserId),
        [activeItem, pendingRecipient, presenceByUserId],
    );

    const sidebarSearch = sidebarQuery.trim().toLowerCase();

    const filteredConversations = useMemo(() => {
        if (!sidebarSearch) return conversationItems;
        return conversationItems.filter(
            (item) =>
                userMatchesQuery(item.other, sidebarSearch) ||
                matchesQuery(conversationLastPreview(item.lastMessage), sidebarSearch),
        );
    }, [conversationItems, sidebarSearch]);

    useEffect(() => {
        setOpenSwipeId(null);
    }, [sidebarQuery]);

    const handleIncomingMessageRef = useRef<(conversationId: number, message: any) => void>(() => {});

    const markConversationRead = useCallback(async (conversationId: number) => {
        if (document.visibilityState !== 'visible') return;
        try {
            await axios.post(route('chat.conversations.read', conversationId));
        } catch {
            /* abaikan error jaringan sementara */
        }
    }, []);

    const handleIncomingMessage = useCallback(
        (conversationId: number, message: any) => {
            const isMine = message.sender_id === auth.user.id || message.sender?.id === auth.user.id;

            setConversationItems((prev) =>
                sortConversations(
                    prev.map((item) => (item.id === conversationId ? { ...item, lastMessage: message } : item)),
                ),
            );

            if (conversationId === activeId) {
                setMessages((current) => appendMessages(current, [message]));
                if (!isMine) {
                    void markConversationRead(conversationId);
                }
                return;
            }

            if (!isMine) {
                setUnread((prev) => ({ ...prev, [conversationId]: (prev[conversationId] ?? 0) + 1 }));
                const item = conversationItems.find((c) => c.id === conversationId);
                const label = item?.other?.display_name || item?.other?.name || 'Chat';
                toast.message(label, { description: conversationLastPreview(message) });
            }
        },
        [activeId, auth.user.id, conversationItems, markConversationRead],
    );

    handleIncomingMessageRef.current = handleIncomingMessage;

    const applyReadReceiptsToMessages = useCallback((receipts: ReadReceipt[]) => {
        if (!receipts.length) return;
        setMessages((current) => applyReadReceipts(current, receipts));
    }, []);

    const handleMessageRead = useCallback(
        (conversationId: number, payload: MessageReadPayload) => {
            if (conversationId !== activeId || !payload.read_at) return;
            const receipts = payload.message_ids.map((id) => ({ id, read_at: payload.read_at }));
            applyReadReceiptsToMessages(receipts);
        },
        [activeId, applyReadReceiptsToMessages],
    );

    const requestDeleteConversation = useCallback(
        (conversationId: number) => {
            const label = contactLabel(conversationItems.find((c) => c.id === conversationId)?.other);
            setDeleteConversationTarget({ id: conversationId, label });
        },
        [conversationItems],
    );

    const confirmDeleteConversation = useCallback(async () => {
        if (!deleteConversationTarget) {
            return;
        }

        const conversationId = deleteConversationTarget.id;
        setDeleteConversationProcessing(true);
        setDeletingId(conversationId);

        try {
            await axios.delete(route('chat.conversations.destroy', conversationId));
            setConversationItems((prev) => prev.filter((c) => c.id !== conversationId));
            setUnread((prev) => {
                if (!prev[conversationId]) return prev;
                const next = { ...prev };
                delete next[conversationId];
                return next;
            });
            if (activeId === conversationId) {
                setActiveId(null);
                setMessages([]);
                form.setData('conversation_id', '');
            }
            setOpenSwipeId(null);
            toast.success('Percakapan dihapus');
        } catch {
            toast.error('Gagal menghapus percakapan');
        } finally {
            setDeleteConversationProcessing(false);
            setDeletingId(null);
            setDeleteConversationTarget(null);
        }
    }, [activeId, deleteConversationTarget, form]);

    const openChatView = useCallback(() => {
        if (isNarrowScreen) {
            setMobileInChat(true);
        }
    }, [isNarrowScreen]);

    const selectConversation = useCallback(
        (item: ConversationItem) => {
            setOpenSwipeId(null);
            if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
            setAttachmentPreview(null);
            form.setData('attachment', null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            if (!item.id) {
                setPendingRecipient(item.other ?? null);
                setActiveId(null);
                setMessages([]);
                form.setData('conversation_id', '');
                form.setData('recipient_id', item.other?.id ?? '');
                openChatView();
                return;
            }

            setPendingRecipient(null);
            setActiveId(item.id);
            setMessages(item.lastMessage ? [item.lastMessage] : []);
            form.setData('conversation_id', item.id);
            form.setData('recipient_id', '');
            setUnread((prev) => {
                if (!prev[item.id!]) return prev;
                const next = { ...prev };
                delete next[item.id!];
                return next;
            });
            openChatView();
        },
        [attachmentPreview, form, openChatView],
    );

    useEffect(() => {
        const maxId = messages.reduce((max, m) => (typeof m.id === 'number' && m.id > max ? m.id : max), 0);
        lastMessageIdRef.current = maxId;
    }, [messages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!activeId || pendingRecipient) return;

        let cancelled = false;

        const loadHistory = async () => {
            setLoadingMessages(true);
            try {
                const { data } = await axios.get(route('chat.poll'), {
                    params: { conversation_id: activeId, since_id: 0 },
                });
                if (!cancelled) {
                    const loaded = Array.isArray(data.messages) ? data.messages : [];
                    setMessages(applyReadReceipts(loaded, data.read_receipts ?? []));
                    void markConversationRead(activeId);
                }
            } catch {
                if (!cancelled) {
                    toast.error('Gagal memuat pesan. Periksa koneksi lalu pilih percakapan lagi.');
                }
            } finally {
                if (!cancelled) {
                    setLoadingMessages(false);
                }
            }
        };

        void loadHistory();

        const poll = window.setInterval(async () => {
            if (cancelled) return;
            try {
                const { data } = await axios.get(route('chat.poll'), {
                    params: { conversation_id: activeId, since_id: lastMessageIdRef.current },
                });
                if (!cancelled) {
                    if (data.read_receipts?.length) {
                        applyReadReceiptsToMessages(data.read_receipts);
                    }
                    if (data.messages?.length) {
                        data.messages.forEach((msg: any) => {
                            handleIncomingMessageRef.current(activeId, msg);
                        });
                        void markConversationRead(activeId);
                    }
                }
            } catch {
                /* polling sementara gagal — coba lagi interval berikutnya */
            }
        }, 2000);

        return () => {
            cancelled = true;
            window.clearInterval(poll);
        };
    }, [activeId, pendingRecipient, applyReadReceiptsToMessages, markConversationRead]);

    useEffect(() => {
        if (!activeId || pendingRecipient || loadingMessages) return;
        void markConversationRead(activeId);
    }, [activeId, pendingRecipient, loadingMessages, messages.length, markConversationRead]);

    useEffect(() => {
        return () => {
            if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
        };
    }, [attachmentPreview]);

    useEffect(() => {
        const pollPresence = async () => {
            try {
                const { data } = await axios.get(route('chat.presence'));
                const users = data.users as Record<number, UserPresence>;
                setPresenceByUserId((prev) => ({ ...prev, ...users }));
                setConversationItems((prev) =>
                    prev.map((item) =>
                        item.other?.id && users[item.other.id]
                            ? { ...item, other: { ...item.other, ...users[item.other.id] } }
                            : item,
                    ),
                );
            } catch {
                /* abaikan error jaringan sementara */
            }
        };

        void pollPresence();
        const intervalId = window.setInterval(pollPresence, 10_000);

        return () => window.clearInterval(intervalId);
    }, []);

    const clearAttachment = () => {
        form.setData('attachment', null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (attachmentPreview) {
            URL.revokeObjectURL(attachmentPreview);
            setAttachmentPreview(null);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
        if (file) {
            setAttachmentPreview(URL.createObjectURL(file));
            form.setData('attachment', file);
            form.clearErrors('attachment');
        } else {
            setAttachmentPreview(null);
            form.setData('attachment', null);
        }
    };

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        const bodyText = form.data.body.trim();
        const file = form.data.attachment;
        if (!bodyText && !file) return;

        const formData = new FormData();
        if (activeId) {
            formData.append('conversation_id', String(activeId));
        } else if (pendingRecipient?.id) {
            formData.append('recipient_id', String(pendingRecipient.id));
        } else {
            return;
        }
        if (bodyText) formData.append('body', bodyText);
        if (file) formData.append('attachment', file);
        if (form.data.context_type) formData.append('context_type', form.data.context_type);
        if (form.data.context_id) formData.append('context_id', form.data.context_id);

        setSending(true);
        try {
            const { data } = await axios.post(route('chat.messages.store'), formData, {
                headers: { Accept: 'application/json' },
            });
            if (data.message) {
                const conversationId = data.message.conversation_id as number;
                if (pendingRecipient) {
                    const existing = conversationItems.find((c) => c.id === conversationId);
                    if (existing) {
                        setConversationItems((prev) =>
                            sortConversations(
                                prev.map((item) =>
                                    item.id === conversationId ? { ...item, lastMessage: data.message } : item,
                                ),
                            ),
                        );
                    } else {
                        setConversationItems((prev) =>
                            sortConversations([
                                ...prev,
                                {
                                    id: conversationId,
                                    other: pendingRecipient,
                                    lastMessage: data.message,
                                },
                            ]),
                        );
                    }
                    setPendingRecipient(null);
                    setActiveId(conversationId);
                    form.setData('conversation_id', conversationId);
                    form.setData('recipient_id', '');
                    openChatView();
                }
                handleIncomingMessage(conversationId, data.message);
            }
            form.setData('body', '');
            form.setData('attachment', null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (attachmentPreview) {
                URL.revokeObjectURL(attachmentPreview);
                setAttachmentPreview(null);
            }
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                if (err.response?.status === 422) {
                    const errors = err.response.data?.errors ?? {};
                    Object.entries(errors).forEach(([key, value]) => {
                        form.setError(key as 'body' | 'attachment', Array.isArray(value) ? value[0] : String(value));
                    });
                } else if (err.response?.status === 403) {
                    toast.error('Anda tidak diizinkan mengirim pesan ke pengguna ini.');
                } else {
                    toast.error('Gagal mengirim pesan. Coba lagi.');
                }
            }
        } finally {
            setSending(false);
        }
    };

    const canSend =
        (form.data.body.trim() !== '' || Boolean(form.data.attachment)) && Boolean(activeId || pendingRecipient);

    const showList = !isNarrowScreen || !mobileInChat;
    const showChatPanel = !isNarrowScreen || mobileInChat;

    return (
        <AppLayout title="Chat">
            {activeId ? (
                <ChatConversationListener
                    conversationId={activeId}
                    onMessage={handleIncomingMessage}
                    onRead={handleMessageRead}
                />
            ) : null}

            <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[320px_1fr] lg:grid-rows-1">
                <aside
                    className={`min-h-0 flex-col overflow-hidden border-slate-200 bg-slate-50/60 p-4 dark:border-slate-600 dark:bg-slate-900/40 lg:min-h-0 lg:border-r-2 ${
                        isNarrowScreen ? (showList ? 'flex flex-1' : 'hidden') : 'flex'
                    }`}
                >
                    <h2 className="mb-3 shrink-0 text-lg font-black">Percakapan</h2>
                    <div className="relative mb-4 shrink-0">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            className="input w-full !py-2.5 !pl-10 text-sm"
                            placeholder="Cari nama atau pesan…"
                            value={sidebarQuery}
                            onChange={(e) => setSidebarQuery(e.target.value)}
                            aria-label="Cari percakapan"
                        />
                    </div>
                    <div className="scrollbar-hidden min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
                        {filteredConversations.map((item) => {
                            const rowKey = item.id ?? `contact-${item.other?.id}`;
                            const isActive =
                                (item.id !== null && item.id === activeId && !pendingRecipient) ||
                                (item.id === null && pendingRecipient?.id === item.other?.id);
                            const unreadCount = item.id ? (unread[item.id] ?? 0) : 0;
                            const canDelete = item.id !== null;

                            const rowContent = (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                if (openSwipeId === item.id) {
                                                    setOpenSwipeId(null);
                                                    return;
                                                }
                                                selectConversation(item);
                                            }
                                        }}
                                        className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3 text-left transition ${
                                            isActive
                                                ? 'bg-indigo-100 ring-2 ring-indigo-400 dark:bg-indigo-950/50'
                                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <ChatAvatar user={mergePresence(item.other, presenceByUserId)} className="h-11 w-11" showPresence />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="truncate font-bold">
                                                    {item.other?.display_name || item.other?.name}
                                                </div>
                                                {unreadCount > 0 ? (
                                                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-bold text-white">
                                                        {unreadCount > 9 ? '9+' : unreadCount}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="truncate text-sm text-slate-500 dark:text-slate-400">
                                                {item.lastMessage
                                                    ? conversationLastPreview(item.lastMessage)
                                                    : 'Mulai percakapan'}
                                            </div>
                                        </div>
                                    </div>
                            );

                            if (!canDelete) {
                                return (
                                    <div key={rowKey} onClick={() => selectConversation(item)}>
                                        {rowContent}
                                    </div>
                                );
                            }

                            return (
                                <ConversationListRow
                                    key={rowKey}
                                    open={openSwipeId === item.id}
                                    onOpenChange={(isOpen) => setOpenSwipeId(isOpen ? item.id : null)}
                                    onDelete={() => requestDeleteConversation(item.id!)}
                                    onSelect={() => {
                                        if (openSwipeId === item.id) {
                                            setOpenSwipeId(null);
                                            return;
                                        }
                                        selectConversation(item);
                                    }}
                                    deleting={deletingId === item.id}
                                >
                                    {rowContent}
                                </ConversationListRow>
                            );
                        })}
                        {sidebarSearch && filteredConversations.length === 0 ? (
                            <p className="py-6 text-center text-sm text-slate-500">Tidak ada hasil untuk pencarian ini.</p>
                        ) : null}
                    </div>
                </aside>

                <section
                    className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:min-h-0 ${
                        isNarrowScreen && !showChatPanel ? 'hidden' : 'flex'
                    }`}
                >
                    <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
                        {isNarrowScreen && mobileInChat ? (
                            <button
                                type="button"
                                onClick={() => setMobileInChat(false)}
                                className="btn-muted shrink-0 rounded-xl p-2"
                                aria-label="Kembali ke daftar percakapan"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                        ) : null}
                        <ChatAvatar user={otherUser} className="h-12 w-12" showPresence />
                        <div className="min-w-0 flex-1">
                            <div className="font-black">{otherUser?.display_name || otherUser?.name || 'Pilih percakapan'}</div>
                            {otherUser && (activeId || pendingRecipient) ? <UserPresenceInfo user={otherUser} /> : null}
                            {pendingRecipient ? (
                                <div className="text-xs text-indigo-600 dark:text-indigo-400">Percakapan baru — kirim pesan pertama</div>
                            ) : null}
                        </div>
                    </div>

                    <div className="scrollbar-hidden min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-5">
                        {!activeId && !pendingRecipient ? (
                            <p className="py-12 text-center text-slate-500">
                                {isNarrowScreen ? 'Pilih percakapan di atas.' : 'Pilih percakapan di sebelah kiri.'}
                            </p>
                        ) : null}
                        {loadingMessages ? (
                            <p className="py-8 text-center text-sm text-slate-500">Memuat pesan…</p>
                        ) : null}
                        {pendingRecipient && messages.length === 0 ? (
                            <p className="py-12 text-center text-slate-500">
                                Mulai percakapan dengan {contactLabel(pendingRecipient)}.
                            </p>
                        ) : null}
                        {messages.map((message: any) => {
                            const mine = message.sender_id === auth.user.id || message.sender?.id === auth.user.id;
                            const sender = message.sender ?? (mine ? auth.user : otherUser);
                            const hasText = message.body && String(message.body).trim() !== '';
                            return (
                                <div key={message.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                                    {!mine ? <ChatAvatar user={sender} className="h-9 w-9" /> : null}
                                    <div
                                        className={`max-w-[75%] rounded-3xl px-4 py-3 ${
                                            mine ? 'bg-gradient-to-r from-indigo-600 to-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-800'
                                        }`}
                                    >
                                        {hasText ? <div className="whitespace-pre-wrap break-words">{message.body}</div> : null}
                                        <MessageAttachmentBlock message={message} mine={mine} />
                                        <div
                                            className={`mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs ${
                                                mine ? 'justify-end text-white/80' : 'text-slate-500'
                                            }`}
                                        >
                                            <span className="shrink-0">{dateTime(message.created_at)}</span>
                                            <MessageReadReceipt readAt={message.read_at} mine={mine} />
                                        </div>
                                    </div>
                                    {mine ? <ChatAvatar user={sender} className="h-9 w-9" /> : null}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={send} className="shrink-0 space-y-3 border-t border-slate-100 p-4 dark:border-slate-800">
                        {form.errors.attachment ? (
                            <p className="text-sm text-red-600 dark:text-red-400">{form.errors.attachment}</p>
                        ) : null}
                        {attachmentPreview ? (
                            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                {form.data.attachment?.type.startsWith('image/') ? (
                                    <img src={attachmentPreview} alt="Pratinjau" className="h-16 w-16 rounded-lg object-cover" />
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-200 text-2xl dark:bg-slate-700">
                                        📄
                                    </div>
                                )}
                                <div className="min-w-0 flex-1 pt-1">
                                    <p className="truncate text-sm font-medium">{form.data.attachment?.name}</p>
                                    <p className="text-xs text-slate-500">JPEG, PNG, GIF, WebP, atau PDF · maks. 10 MB</p>
                                </div>
                                <button type="button" onClick={clearAttachment} className="btn-muted rounded-xl p-2" title="Hapus lampiran">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                                className="sr-only"
                                id="chat-attachment"
                                onChange={onFileChange}
                                disabled={!activeId && !pendingRecipient}
                            />
                            <label
                                htmlFor="chat-attachment"
                                className={`btn-muted inline-flex items-center justify-center !rounded-xl !p-3 ${
                                    !activeId && !pendingRecipient ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                                }`}
                                title="Lampirkan gambar atau PDF"
                            >
                                <ImagePlus className="h-5 w-5" />
                            </label>
                            <input
                                className="input min-w-0 flex-1"
                                value={form.data.body}
                                onChange={(e) => form.setData('body', e.target.value)}
                                placeholder="Tulis pesan… (opsional jika ada lampiran)"
                                disabled={!activeId && !pendingRecipient}
                            />
                            <button type="submit" disabled={sending || !canSend} className="btn-primary shrink-0">
                                <Send className="h-4 w-4" /> Kirim
                            </button>
                        </div>
                    </form>
                </section>
            </div>

            <ConfirmModal
                show={deleteConversationTarget !== null}
                title="Hapus Percakapan"
                message={
                    deleteConversationTarget
                        ? `Hapus chat dengan ${deleteConversationTarget.label}? Semua pesan akan dihapus.`
                        : ''
                }
                onClose={() => !deleteConversationProcessing && setDeleteConversationTarget(null)}
                onConfirm={() => void confirmDeleteConversation()}
                processing={deleteConversationProcessing}
            />
        </AppLayout>
    );
}
