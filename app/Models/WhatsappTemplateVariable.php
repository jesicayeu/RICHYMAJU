<?php

namespace App\Models;

use App\Services\WhatsappTemplateVariableResolver;
use Illuminate\Database\Eloquent\Model;

class WhatsappTemplateVariable extends Model
{
    protected $fillable = [
        'var_name',
        'var_source',
        'db_table',
        'db_column',
        'var_name_alt',
        'data_label',
    ];

    protected function casts(): array
    {
        return [
            'var_source' => 'string',
        ];
    }

    public function displayTableLabel(): string
    {
        return match ($this->var_source) {
            'auth' => 'Pengguna login',
            'counterpart' => 'Pengguna penerima',
            default => WhatsappTemplateVariableResolver::ALLOWED_TABLES[$this->db_table] ?? $this->db_table,
        };
    }
}
