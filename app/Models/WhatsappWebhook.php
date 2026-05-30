<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappWebhook extends Model
{
    protected $fillable = [
        'whatsapp_account_id',
        'url',
        'events',
        'hmac_key',
        'retries_policy',
        'delay_seconds',
        'attempts',
        'custom_headers',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'events' => 'array',
            'custom_headers' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(WhatsappAccount::class, 'whatsapp_account_id');
    }

    public function toWahaConfig(): array
    {
        $config = [
            'url' => $this->url,
            'events' => $this->events,
        ];

        if ($this->hmac_key) {
            $config['hmac'] = ['key' => $this->hmac_key];
        }

        $config['retries'] = [
            'policy' => $this->retries_policy,
            'delaySeconds' => $this->delay_seconds,
            'attempts' => $this->attempts,
        ];

        if ($this->custom_headers) {
            $config['customHeaders'] = collect($this->custom_headers)
                ->map(fn ($header) => [
                    'name' => $header['name'] ?? '',
                    'value' => $header['value'] ?? '',
                ])
                ->filter(fn ($h) => $h['name'] !== '')
                ->values()
                ->all();
        }

        return $config;
    }
}
