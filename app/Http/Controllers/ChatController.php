<?php

namespace App\Http\Controllers;

use App\Events\MessageRead;
use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\WhatsappNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $this->ensureDefaultConversation($user);

        $conversations = Conversation::with(['participantA', 'participantB', 'messages' => fn ($q) => $q->latest()->limit(1)])
            ->where(fn ($query) => $query->where('participant_a_id', $user->id)->orWhere('participant_b_id', $user->id))
            ->orderByRaw('COALESCE(last_message_at, created_at) DESC')
            ->get()
            ->map(fn (Conversation $conversation) => [
                'id' => $conversation->id,
                'other' => $this->formatChatUser($conversation->otherParticipant($user)),
                'lastMessage' => $conversation->messages->first(),
            ]);

        $active = Conversation::with(['participantA', 'participantB', 'messages.sender'])
            ->where(fn ($query) => $query->where('participant_a_id', $user->id)->orWhere('participant_b_id', $user->id))
            ->orderByRaw('COALESCE(last_message_at, created_at) DESC')
            ->first();

        return Inertia::render('Chat/Index', [
            'conversations' => $conversations,
            'activeConversation' => $active ? [
                'id' => $active->id,
                'messages' => $active->messages,
                'other' => $this->formatChatUser($active->otherParticipant($user)),
            ] : null,
            'contacts' => $this->chatContacts($user)
                ->map(fn (User $contact) => $this->formatChatUser($contact))
                ->filter()
                ->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'conversation_id' => ['nullable', 'exists:conversations,id'],
            'recipient_id' => ['nullable', 'exists:users,id'],
            'body' => ['nullable', 'string', 'max:1000'],
            'attachment' => ['nullable', 'file', 'max:10240', 'mimes:jpeg,jpg,png,gif,webp,pdf'],
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
            $originalName = $attachmentFile->getClientOriginalName();
            $extension = $attachmentFile->getClientOriginalExtension() ?: $attachmentFile->extension();
            $filename = 'chat/'.Str::uuid().'.'.$extension;
            $attachmentFile->storeAs('', $filename, 'public');
            $attachmentPath = $filename;
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'body' => $bodyText,
            'attachment_path' => $attachmentPath,
            'attachment_original_name' => $originalName,
            'context_type' => $data['context_type'] ?? null,
            'context_id' => $data['context_id'] ?? null,
        ]);
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

        $recipient = $conversation->otherParticipant($user);
        app(WhatsappNotificationService::class)->dispatch(
            'kirim_chat',
            $user,
            $message,
            [],
            $recipient,
        );

        if ($request->expectsJson()) {
            return response()->json(['message' => $message]);
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

    private function ensureDefaultConversation(User $user): void
    {
        $this->chatContacts($user)->each(
            fn (User $contact) => $this->conversationFor($user, $contact)
        );
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, User>
     */
    private function chatContacts(User $user)
    {
        return User::query()
            ->where('status', 'aktif')
            ->whereIn('role', ['admin', 'kasir'])
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
        abort_unless(in_array($recipient->role, ['admin', 'kasir'], true), 403);

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
