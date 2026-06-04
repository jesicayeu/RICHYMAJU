<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WhatsappActionTemplate;
use App\Models\WhatsappChatId;
use App\Models\WhatsappConfig;
use App\Models\WhatsappSetting;
use App\Services\WahaService;
use App\Support\WhatsappChatIdFormatter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class WhatsAppController extends Controller
{
    public function __construct(
        private WahaService $waha,
    ) {}

    public function index(): Response
    {
        $settings = WhatsappSetting::current();
        $config = WhatsappConfig::current();

        $users = $this->activeUsers();
        $managedUserIds = $users->pluck('id')->map(fn ($id) => (int) $id)->all();

        $this->purgeOrphanWhatsappRecords($managedUserIds);

        $messageTemplates = WhatsappActionTemplate::query()
            ->latest()
            ->get()
            ->filter(fn (WhatsappActionTemplate $t) => $this->templateUserId($t) !== null
                && in_array($this->templateUserId($t), $managedUserIds, true))
            ->map(fn (WhatsappActionTemplate $t) => [
                'id' => $t->id,
                'title' => $t->title ?? '',
                'action_key' => $t->action_key,
                'action_label' => WhatsappActionTemplate::resolveActionLabel($t->action_key, $users),
                'contact_trigger_label' => WhatsappActionTemplate::contactTriggerLabelForActionKey(
                    (string) $t->action_key,
                    $users,
                ),
                'body' => $t->body ?? '',
            ])
            ->values();

        $contacts = WhatsappChatId::query()
            ->whereIn('user_id', $managedUserIds)
            ->with('user:id,name,display_name,phone,role')
            ->latest()
            ->get()
            ->map(fn (WhatsappChatId $contact) => [
                'id' => $contact->id,
                'user_id' => $contact->user_id,
                'name' => $contact->user?->display_name ?: $contact->user?->name ?? '—',
                'phone' => $contact->user?->phone ?? '—',
                'forms_received' => WhatsappChatId::resolveTriggerLabels($contact->action_keys ?? []),
                'action_keys' => WhatsappChatId::normalizeActionKeys($contact->action_keys ?? []),
                'chat_id' => $contact->chat_id,
            ]);

        $accountOptions = User::query()
            ->managedAccounts()
            ->where('status', 'aktif')
            ->whereNotNull('phone')
            ->where('phone', '!=', '')
            ->orderBy('name')
            ->get(['id', 'name', 'display_name', 'phone'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'label' => ($user->display_name ?: $user->name).' — '.$user->phone,
                'phone' => $user->phone,
            ]);

        $actionGroups = WhatsappActionTemplate::actionGroupsForUsers($users);
        $actionTriggerMap = [];

        foreach ($actionGroups as $options) {
            foreach (array_keys($options) as $actionKey) {
                $actionTriggerMap[$actionKey] = WhatsappActionTemplate::contactTriggerLabelForActionKey(
                    $actionKey,
                    $users,
                );
            }
        }

        return Inertia::render('Admin/WhatsApp/Index', [
            'settings' => [
                'host_url' => $settings->host_url ?? config('waha.base_url'),
                'api_key' => $settings->api_key ?? '',
                'connection_status' => $settings->connection_status,
                'last_checked_at' => $settings->last_checked_at?->toIso8601String(),
            ],
            'config' => [
                'session' => $config->session ?? '',
            ],
            'messageTemplates' => $messageTemplates,
            'actionGroups' => $actionGroups,
            'actionTriggerMap' => $actionTriggerMap,
            'actionTypeVariables' => WhatsappActionTemplate::variablesByActionType(),
            'contacts' => $contacts,
            'accountOptions' => $accountOptions,
            'triggerOptions' => WhatsappChatId::TRIGGER_OPTIONS,
            'testRecipients' => $contacts
                ->map(fn (array $contact) => [
                    'id' => $contact['id'],
                    'label' => $contact['name'].' — '.$contact['phone'],
                    'phone' => $contact['phone'],
                    'chat_id' => $contact['chat_id'],
                ])
                ->values(),
        ]);
    }

    public function sendTestMessage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'contact_id' => ['required', 'integer', Rule::exists('whatsapp_chat_ids', 'id')],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $settings = WhatsappSetting::current();

        if ($settings->connection_status !== 'terhubung') {
            return response()->json([
                'ok' => false,
                'message' => 'WAHA belum terhubung. Hubungkan di tab Config terlebih dahulu.',
            ], 422);
        }

        $config = WhatsappConfig::current();

        if (! $config->session) {
            return response()->json([
                'ok' => false,
                'message' => 'Session belum dikonfigurasi.',
            ], 422);
        }

        $contact = WhatsappChatId::query()
            ->with('user:id,phone')
            ->findOrFail($data['contact_id']);

        $phone = $contact->user?->phone;

        if (! $phone) {
            return response()->json([
                'ok' => false,
                'message' => 'Nomor HP kontak tidak tersedia.',
            ], 422);
        }

        try {
            $this->waha->useSettings($settings);

            $resolvedChatId = $this->waha->sendTextToPhone(
                $config->session,
                $phone,
                $data['message'],
            );

            $contact->update(['chat_id' => $resolvedChatId]);

            return response()->json([
                'ok' => true,
                'message' => 'Pesan tes berhasil dikirim ke '.$phone.'.',
                'chat_id' => $resolvedChatId,
            ]);
        } catch (RuntimeException $e) {
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function connect(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'host_url' => ['required', 'url', 'max:500'],
            'api_key' => ['nullable', 'string', 'max:500'],
            'session' => ['required', 'string', 'max:100'],
        ]);

        $settings = WhatsappSetting::current();
        $settings->host_url = rtrim($data['host_url'], '/');

        if (! empty($data['api_key'])) {
            $settings->api_key = $data['api_key'];
        }

        WhatsappConfig::current()->update([
            'operation' => 'sendText',
            'session' => $data['session'],
        ]);

        try {
            $this->waha->useSettings($settings)->testConnection();
            $settings->connection_status = 'terhubung';
            $settings->last_checked_at = now();
            $settings->save();

            return back()->with('success', 'Koneksi WAHA berhasil.');
        } catch (RuntimeException $e) {
            $settings->connection_status = 'gagal';
            $settings->last_checked_at = now();
            $settings->save();

            return back()->with('error', 'Gagal menghubungkan WAHA: '.$e->getMessage());
        }
    }

    public function storeMessageTemplate(Request $request): RedirectResponse
    {
        $users = $this->activeUsers();
        $keys = array_keys(WhatsappActionTemplate::actionKeysForUsers($users));

        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'action_key' => ['required', 'string', 'max:60', 'in:'.implode(',', $keys)],
            'body' => ['nullable', 'string', 'max:5000'],
        ]);

        WhatsappActionTemplate::create($data);

        return back()->with('success', 'Pesan disimpan.');
    }

    public function updateMessageTemplate(Request $request, WhatsappActionTemplate $template): RedirectResponse
    {
        $users = $this->activeUsers();
        $keys = array_keys(WhatsappActionTemplate::actionKeysForUsers($users));

        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'action_key' => ['required', 'string', 'max:60', 'in:'.implode(',', $keys)],
            'body' => ['nullable', 'string', 'max:5000'],
        ]);

        $template->update($data);

        return back()->with('success', 'Pesan diperbarui.');
    }

    public function destroyMessageTemplate(WhatsappActionTemplate $template): RedirectResponse
    {
        $template->delete();

        return back()->with('success', 'Pesan dihapus.');
    }

    public function storeContact(Request $request): RedirectResponse
    {
        $validTriggers = array_keys(WhatsappChatId::TRIGGER_OPTIONS);

        $data = $request->validate([
            'user_id' => [
                'required',
                Rule::exists('users', 'id')->where(
                    fn ($query) => $query->whereIn('role', ['admin', 'kasir'])->where('status', 'aktif'),
                ),
            ],
            'action_keys' => ['required', 'array', 'min:1'],
            'action_keys.*' => ['string', 'in:'.implode(',', $validTriggers)],
        ]);

        $user = User::query()->managedAccounts()->whereKey($data['user_id'])->firstOrFail();
        $chatId = WhatsappChatIdFormatter::fromPhone($user->phone);

        if (! $chatId) {
            return back()->with('error', 'Nomor HP akun tidak valid.');
        }

        WhatsappChatId::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'chat_id' => $chatId,
                'label' => $user->display_name ?: $user->name,
                'action_keys' => WhatsappChatId::normalizeActionKeys(
                    array_values(array_unique($data['action_keys']))
                ),
            ],
        );

        return back()->with('success', 'Kontak disimpan.');
    }

    public function updateContact(Request $request, WhatsappChatId $contact): RedirectResponse
    {
        $validTriggers = array_keys(WhatsappChatId::TRIGGER_OPTIONS);

        $data = $request->validate([
            'user_id' => [
                'required',
                Rule::exists('users', 'id')->where(
                    fn ($query) => $query->whereIn('role', ['admin', 'kasir'])->where('status', 'aktif'),
                ),
            ],
            'action_keys' => ['required', 'array', 'min:1'],
            'action_keys.*' => ['string', 'in:'.implode(',', $validTriggers)],
        ]);

        $user = User::query()->managedAccounts()->whereKey($data['user_id'])->firstOrFail();
        $chatId = WhatsappChatIdFormatter::fromPhone($user->phone);

        if (! $chatId) {
            return back()->with('error', 'Nomor HP akun tidak valid.');
        }

        if ((int) $data['user_id'] !== $contact->user_id) {
            $exists = WhatsappChatId::query()
                ->where('user_id', $data['user_id'])
                ->where('id', '!=', $contact->id)
                ->exists();

            if ($exists) {
                return back()->with('error', 'Kontak untuk akun ini sudah ada.');
            }
        }

        $contact->update([
            'user_id' => $user->id,
            'chat_id' => $chatId,
            'label' => $user->display_name ?: $user->name,
            'action_keys' => WhatsappChatId::normalizeActionKeys(
                array_values(array_unique($data['action_keys']))
            ),
        ]);

        return back()->with('success', 'Kontak diperbarui.');
    }

    public function destroyContact(WhatsappChatId $contact): RedirectResponse
    {
        $contact->delete();

        return back()->with('success', 'Kontak dihapus.');
    }

    /** @return \Illuminate\Database\Eloquent\Collection<int, User> */
    private function activeUsers()
    {
        return User::query()
            ->managedAccounts()
            ->where('status', 'aktif')
            ->orderBy('name')
            ->get(['id', 'name', 'display_name', 'role']);
    }

    /** @param  list<int>  $managedUserIds */
    private function purgeOrphanWhatsappRecords(array $managedUserIds): void
    {
        WhatsappActionTemplate::query()
            ->get()
            ->each(function (WhatsappActionTemplate $template) use ($managedUserIds) {
                $userId = $this->templateUserId($template);

                if ($userId === null || ! in_array($userId, $managedUserIds, true)) {
                    $template->delete();
                }
            });

        WhatsappChatId::query()
            ->whereNotIn('user_id', $managedUserIds)
            ->delete();
    }

    private function templateUserId(WhatsappActionTemplate $template): ?int
    {
        $parsed = WhatsappActionTemplate::parseActionKey((string) $template->action_key);

        return $parsed['user_id'] ?? null;
    }
}
