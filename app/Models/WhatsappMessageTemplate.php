<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappMessageTemplate extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'body',
        'variables',
        'category',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'variables' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public static function extractVariables(string $body): array
    {
        preg_match_all('/\{([a-zA-Z0-9_]+)\}/', $body, $matches);

        return array_values(array_unique($matches[1] ?? []));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function render(array $data): string
    {
        $result = $this->body;

        foreach ($data as $key => $value) {
            $result = str_replace('{'.$key.'}', (string) $value, $result);
        }

        return $result;
    }
}
