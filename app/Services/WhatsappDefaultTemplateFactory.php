<?php

namespace App\Services;

use App\Models\User;
use App\Models\WhatsappActionTemplate;

class WhatsappDefaultTemplateFactory
{
    /** @return array{title: string, body: string} */
    public static function forUserAction(User $user, string $actionType, string $actionLabel): array
    {
        $account = $user->display_name ?: $user->name;
        $title = "{$actionLabel} — {$account}";

        return [
            'title' => $title,
            'body' => self::bodyForActionType($actionType, $actionLabel),
        ];
    }

    protected static function bodyForActionType(string $actionType, string $actionLabel): string
    {
        return match (true) {
            $actionType === 'transaksi_tambah' => self::transaksiBody($actionLabel, 'ditambahkan'),
            $actionType === 'transaksi_ubah' => self::transaksiBody($actionLabel, 'diubah'),
            $actionType === 'transaksi_hapus' => self::transaksiBody($actionLabel, 'dihapus'),
            $actionType === 'stok_tambah' => self::stokBody($actionLabel, 'ditambahkan'),
            $actionType === 'stok_ubah' => self::stokBody($actionLabel, 'diubah'),
            $actionType === 'stok_hapus' => self::stokBody($actionLabel, 'dihapus'),
            $actionType === 'utang_tambah' => self::utangBody($actionLabel, 'ditambahkan'),
            $actionType === 'utang_ubah' => self::utangBody($actionLabel, 'diubah'),
            $actionType === 'utang_hapus' => self::utangBody($actionLabel, 'dihapus'),
            $actionType === 'kirim_chat' => self::chatBody(),
            default => "{$actionLabel}\n\nOleh: {nama_pengirim}",
        };
    }

    protected static function transaksiBody(string $actionLabel, string $verb): string
    {
        return <<<TXT
🔔 {$actionLabel} {$verb}

Jenis: {jenis}
Nominal: {nominal}
Keterangan: {keterangan}
Status: {status}
Tanggal: {tanggal}
Gambar: {gambar}

Oleh: {nama_pengirim}
TXT;
    }

    protected static function stokBody(string $actionLabel, string $verb): string
    {
        return <<<TXT
📦 {$actionLabel} {$verb}

Barang: {nama_barang}
Jenis: {jenis}
Jumlah: {jumlah} {satuan}
Status: {status}
Catatan: {catatan}
Tanggal: {tanggal}

Oleh: {nama_pengirim}
TXT;
    }

    protected static function utangBody(string $actionLabel, string $verb): string
    {
        return <<<TXT
💰 {$actionLabel} {$verb}

Pihak: {pihak}
Barang: {barang}
Nominal: {nominal}
Status: {status}
Tanggal: {tanggal}
Gambar: {gambar}

Oleh: {nama_pengirim}
TXT;
    }

    protected static function chatBody(): string
    {
        return <<<'TXT'
💬 Pesan Chat Baru

Dari: {nama_pengirim}
Kepada: {nama_penerima}

{isi_pesan}

Lampiran: {lampiran}
TXT;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, User>  $users
     * @return list<array{action_key: string, title: string, body: string}>
     */
    public static function allForUsers($users): array
    {
        $templates = [];

        foreach (WhatsappActionTemplate::actionGroupsForUsers($users) as $options) {
            foreach ($options as $actionKey => $actionLabel) {
                $parsed = WhatsappActionTemplate::parseActionKey($actionKey);
                if (! $parsed) {
                    continue;
                }

                $user = $users->firstWhere('id', $parsed['user_id']);
                if (! $user) {
                    continue;
                }

                $data = self::forUserAction($user, $parsed['action_type'], $actionLabel);
                $templates[] = [
                    'action_key' => $actionKey,
                    'title' => $data['title'],
                    'body' => trim($data['body']),
                ];
            }
        }

        return $templates;
    }
}
