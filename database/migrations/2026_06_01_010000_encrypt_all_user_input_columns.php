<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('debts')) {
            Schema::table('debts', function (Blueprint $table) {
                if ($this->hasIndex('debts', 'debts_code_unique')) {
                    $table->dropUnique(['code']);
                }
                if ($this->hasIndex('debts', 'debts_status_verification_status_occurred_at_index')) {
                    $table->dropIndex(['status', 'verification_status', 'occurred_at']);
                }
            });

            Schema::table('debts', function (Blueprint $table) {
                $table->text('code')->change();
                $table->text('party_type')->change();
                $table->text('amount')->change();
                $table->text('status')->change();
                $table->text('verification_status')->nullable()->change();
                $table->text('evidence_path')->nullable()->change();
            });
        }

        if (Schema::hasTable('stock_movements')) {
            Schema::table('stock_movements', function (Blueprint $table) {
                if ($this->hasIndex('stock_movements', 'stock_movements_code_unique')) {
                    $table->dropUnique(['code']);
                }
                if ($this->hasIndex('stock_movements', 'stock_movements_type_status_occurred_at_index')) {
                    $table->dropIndex(['type', 'status', 'occurred_at']);
                }
                if ($this->hasIndex('stock_movements', 'stock_movements_item_name_index')) {
                    $table->dropIndex(['item_name']);
                }
            });

            Schema::table('stock_movements', function (Blueprint $table) {
                $table->text('code')->change();
                $table->text('type')->change();
                $table->text('quantity')->change();
                $table->text('unit')->change();
                $table->text('status')->change();
            });
        }

        if (Schema::hasTable('messages')) {
            Schema::table('messages', function (Blueprint $table) {
                $table->text('attachment_path')->nullable()->change();
                $table->text('context_type')->nullable()->change();
                $table->text('context_id')->nullable()->change();
            });
        }

        if (Schema::hasTable('audit_logs')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->text('action')->change();
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                $table->text('name')->change();
                $table->text('display_name')->nullable()->change();
                $table->text('phone')->nullable()->change();
                $table->text('avatar_path')->nullable()->change();
            });
        }

        if (Schema::hasTable('whatsapp_action_templates')) {
            Schema::table('whatsapp_action_templates', function (Blueprint $table) {
                if ($this->hasIndex('whatsapp_action_templates', 'whatsapp_action_templates_action_key_unique')) {
                    $table->dropUnique(['action_key']);
                }
            });

            Schema::table('whatsapp_action_templates', function (Blueprint $table) {
                $table->text('title')->change();
                $table->text('action_key')->change();
                $table->longText('body')->change();
            });
        }

        if (Schema::hasTable('whatsapp_chat_ids')) {
            Schema::table('whatsapp_chat_ids', function (Blueprint $table) {
                if ($this->hasIndex('whatsapp_chat_ids', 'whatsapp_chat_ids_user_id_chat_id_unique')) {
                    if (! $this->hasIndex('whatsapp_chat_ids', 'whatsapp_chat_ids_user_id_index')) {
                        $table->index('user_id');
                    }
                    $table->dropUnique(['user_id', 'chat_id']);
                }
            });

            Schema::table('whatsapp_chat_ids', function (Blueprint $table) {
                $table->text('chat_id')->change();
                $table->text('label')->nullable()->change();
                $table->longText('action_keys')->nullable()->change();
            });
        }

        if (Schema::hasTable('whatsapp_configs')) {
            Schema::table('whatsapp_configs', function (Blueprint $table) {
                $table->text('session')->change();
                $table->longText('default_text')->nullable()->change();
            });
        }
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        $indexes = Schema::getIndexes($table);

        foreach ($indexes as $index) {
            if (($index['name'] ?? null) === $indexName) {
                return true;
            }
        }

        return false;
    }

    public function down(): void
    {
        // Kolom terenkripsi tidak aman dikembalikan ke tipe asli tanpa dekripsi penuh.
    }
};
