<?php

namespace App\Http\Controllers;

use App\Events\MessageRead;
use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\GoogleDriveService;
use App\Services\WhatsappNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    public function __construct(
        private GoogleDriveService $drive,
    ) {}
    public function index(Request $request): Response
    {
        $user = $request->user();
        $managedIds = User::activeManagedAccountIds();
        $this->purgeOrphanConversations($managedIds);

        $contacts = $this->chatContacts($user);
        foreach ($contacts as $contact) {
            $this->conversationFor($user, $contact);
        }

        $conversationsByPartnerId = Conversation::query()
            ->with(['participantA', 'participantB', 'messages' => fn ($q) => $q->latest()->limit(1)])
            ->where(fn ($query) => $query->where('participant_a_id', $user->id)->orWhere('participant_b_id', $user->id))
            ->get()
            ->filter(function (Conversation $conversation) use ($user, $contacts) {
                $other = $conversation->otherParticipant($user);

                return $other && $contacts->contains('id', $other->id);
            })
            ->keyBy(fn (Conversation $conversation) => $conversation->otherParticipant($user)->id);

        $conversationItems = $contacts
            ->map(function (User $contact) use ($conversationsByPartnerId) {
                $existing = $conversationsByPartnerId->get($contact->id);

                if ($existing) {
                    return [
                        'id' => $existing->id,
                        'other' => $this->formatChatUser($contact),
                        'lastMessage' => $existing->messages->first(),
                    ];
                }

                return [
                    'id' => null,
                    'other' => $this->formatChatUser($contact),
                    'lastMessage' => null,
                ];
            })
            ->sortByDesc(function (array $item) {
                $at = $item['lastMessage']?->created_at;

                return $at instanceof \DateTimeInterface ? $at->getTimestamp() : 0;
            })
            ->values();

        $active = $conversationsByPartnerId->sortByDesc(
            fn (Conversation $conversation) => $conversation->last_message_at ?? $conversation->created_at,
        )->first();

        return Inertia::render('Chat/Index', [
            'conversations' => $conversationItems,
            'activeConversation' => $active ? [
                'id' => $active->id,
                'messages' => $active->messages()->with('sender')->oldest()->get(),
                'other' => $this->formatChatUser($active->otherParticipant($user)),
            ] : null,
            'contacts' => $contacts
                ->map(fn (User $contact) => $this->formatChatUser($contact))
                ->filter()
                ->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'conversation_id' => ['nullable', 'integer', 'exists:conversations,id'],
            'recipient_id' => ['nullable', 'integer', 'exists:users,id'],
            'body' => ['nullable', 'string', 'max:1000'],
            'attachment' => ['nullable', 'file', 'max:10240', 'mimetypes:image/jpeg,image/png,image/gif,image/webp,application/pdf'],
            'context_type' => ['nullable', 'in:transaction,debt'],
            'context_id' => ['nullable', 'integer'],
        ]);

        $bodyText = trim((string) ($data['body'] ?? ''));
        $attachmentFile = $request->file('attachment');

        if (! $attachmentFile && $bodyText === '') {
            throw ValidationException::withMessages([
                'body' => 'Tulis pesan atau lampirkan gambar / berkas.',
            ]);
        }

        if (! isset($data['conversation_id']) && ! isset($data['recipient_id'])) {
            throw ValidationException::withMessages([
                'recipient_id' => 'Pilih lawan bicara terlebih dahulu.',
            ]);
        }

        $conversation = isset($data['conversation_id'])
            ? Conversation::findOrFail($data['conversation_id'])
            : $this->conversationFor($user, $this->authorizedRecipient($user, User::findOrFail($data['recipient_id'])));

        abort_unless($conversation->participant_a_id === $user->id || $conversation->participant_b_id === $user->id, 403);

        $attachmentPath = null;
        $originalName = null;
        if ($attachmentFile) {
            $originalName = $attachmentFile->getClientOriginalName() ?: 'lampiran.jpg';

            try {
                $attachmentPath = $this->drive->upload($attachmentFile, 'chat');
            } catch (Throwable $e) {
                Log::error('Gagal mengunggah lampiran chat.', [
                    'conversation_id' => $conversation->id,
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);

                throw ValidationException::withMessages([
                    'attachment' => 'Gagal mengunggah lampiran. Pastikan Google Drive sudah terhubung.',
                ]);
            }
        }

        try {
            $message = Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $user->id,
                'body' => $bodyText,
                'attachment_path' => $attachmentPath,
                'attachment_original_name' => $originalName,
                'context_type' => $data['context_type'] ?? null,
                'context_id' => $data['context_id'] ?? null,
            ]);
        } catch (Throwable $e) {
            if ($attachmentPath) {
                $this->drive->delete($attachmentPath);
            }

            Log::error('Gagal menyimpan pesan chat.', [
                'conversation_id' => $conversation->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'attachment' => 'Gagal menyimpan pesan. Coba lagi.',
            ]);
        }
        $conversation->update(['last_message_at' => now()]);
        $message->load('sender');

        try {
            MessageSent::dispatch($message);
        } catch (Throwable $e) {
            Log::warning('Chat broadcast gagal, pesan tetap tersimpan.', [
                'conversation_id' => $conversation->id,
                'message_id' => $message->id,
                'error' => $e->getMessage(),
            ]);
        }

        try {
            $recipient = $conversation->otherParticipant($user);
            app(WhatsappNotificationService::class)->dispatch(
                'kirim_chat',
                $user,
                $message,
                [],
                $recipient,
            );
        } catch (Throwable $e) {
            Log::warning('WhatsApp notifikasi chat gagal, pesan tetap tersimpan.', [
                'message_id' => $message->id,
                'error' => $e->getMessage(),
            ]);
        }

        if ($request->expectsJson()) {
            return response()->json(['message' => $this->formatMessage($message)]);
        }

        return back();
    }

    public function presence(Request $request): JsonResponse
    {
        $user = $request->user();

        $users = $this->chatContacts($user)
            ->mapWithKeys(fn (User $contact) => [$contact->id => $contact->fresh()->presencePayload()]);

        return response()->json(['users' => $users]);
    }

    public function poll(Request $request): JsonResponse
    {
        $data = $request->validate([
            'conversation_id' => ['required', 'exists:conversations,id'],
            'since_id' => ['nullable', 'integer'],
        ]);
        $conversation = $this->authorizedConversation($request, (int) $data['conversation_id']);
        $user = $request->user();

        return response()->json([
            'messages' => $this->messagesSince($conversation, (int) ($data['since_id'] ?? 0)),
            'read_receipts' => $this->readReceiptsFor($conversation, $user),
        ]);
    }

    public function markRead(Request $request, Conversation $conversation): JsonResponse
    {
        abort_unless(
            $conversation->participant_a_id === $request->user()->id
            || $conversation->participant_b_id === $request->user()->id,
            403
        );

        $user = $request->user();
        $unread = $conversation->messages()
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->pluck('id');

        if ($unread->isEmpty()) {
            return response()->json([
                'message_ids' => [],
                'read_at' => null,
            ]);
        }

        $readAt = now();
        Message::whereIn('id', $unread)->update(['read_at' => $readAt]);
        $readAtIso = $readAt->toIso8601String();

        try {
            MessageRead::dispatch($conversation->id, $unread->all(), $readAtIso);
        } catch (Throwable $e) {
            Log::warning('Broadcast MessageRead gagal.', [
                'conversation_id' => $conversation->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'message_ids' => $unread->values()->all(),
            'read_at' => $readAtIso,
        ]);
    }

    public function destroy(Request $request, Conversation $conversation): JsonResponse
    {
        abort_unless(
            $conversation->participant_a_id === $request->user()->id
            || $conversation->participant_b_id === $request->user()->id,
            403
        );

        $conversation->messages()->delete();
        $conversation->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatMessage(Message $message): array
    {
        $message->loadMissing('sender');

        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'body' => $message->body,
            'attachment_url' => $message->attachment_url,
            'attachment_original_name' => $message->attachment_original_name,
            'context_type' => $message->context_type,
            'context_id' => $message->context_id,
            'read_at' => $message->read_at?->toIso8601String(),
            'created_at' => $message->created_at?->toIso8601String(),
            'sender' => $this->formatChatUser($message->sender),
        ];
    }

    private function authorizedConversation(Request $request, int $conversationId): Conversation
    {
        $conversation = Conversation::findOrFail($conversationId);
        abort_unless(
            $conversation->participant_a_id === $request->user()->id
            || $conversation->participant_b_id === $request->user()->id,
            403
        );

        return $conversation;
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Message>
     */
    private function messagesSince(Conversation $conversation, int $sinceId)
    {
        return $conversation->messages()
            ->with('sender')
            ->when($sinceId > 0, fn ($q) => $q->where('id', '>', $sinceId))
            ->oldest()
            ->get();
    }

    /**
     * @return array<int, array{id: int, read_at: string|null}>
     */
    private function readReceiptsFor(Conversation $conversation, User $user): array
    {
        return $conversation->messages()
            ->where('sender_id', $user->id)
            ->get(['id', 'read_at'])
            ->map(fn (Message $message) => [
                'id' => $message->id,
                'read_at' => $message->read_at?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @param  list<int>  $managedIds
     */
    private function purgeOrphanConversations(array $managedIds): void
    {
        Conversation::query()
            ->get()
            ->each(function (Conversation $conversation) use ($managedIds) {
                if (
                    ! in_array($conversation->participant_a_id, $managedIds, true)
                    || ! in_array($conversation->participant_b_id, $managedIds, true)
                ) {
                    $conversation->messages()->delete();
                    $conversation->delete();
                }
            });
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, User>
     */
    private function chatContacts(User $user)
    {
        return User::query()
            ->managedAccounts()
            ->where('status', 'aktif')
            ->where('id', '!=', $user->id)
            ->orderByRaw("CASE WHEN role = 'admin' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get();
    }

    private function authorizedRecipient(User $user, User $recipient): User
    {
        abort_unless($user->isActive() && in_array($user->role, ['admin', 'kasir'], true), 403);
        abort_unless($recipient->isActive(), 403);
        abort_if($recipient->id === $user->id, 403);
        abort_unless(
            User::query()->managedAccounts()->whereKey($recipient->id)->exists(),
            403,
        );

        return $recipient;
    }

    private function conversationFor(User $first, User $second): Conversation
    {
        [$a, $b] = collect([$first->id, $second->id])->sort()->values()->all();

        return Conversation::firstOrCreate(['participant_a_id' => $a, 'participant_b_id' => $b]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function formatChatUser(?User $user): ?array
    {
        if (! $user instanceof User) {
            return null;
        }

        return $user->toChatArray();
    }
}
