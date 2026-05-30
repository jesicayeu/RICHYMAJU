<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'username')) {
                $table->string('username')->nullable()->unique()->after('id');
            }
            if (! Schema::hasColumn('users', 'display_name')) {
                $table->string('display_name')->nullable()->after('name');
            }
            if (! Schema::hasColumn('users', 'role')) {
                $table->string('role', 20)->default('kasir')->after('password');
            }
            if (! Schema::hasColumn('users', 'status')) {
                $table->string('status', 20)->default('aktif')->after('role');
            }
            if (! Schema::hasColumn('users', 'avatar_path')) {
                $table->string('avatar_path')->nullable()->after('status');
            }
            if (! Schema::hasColumn('users', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        DB::table('users')->orderBy('id')->get()->each(function ($user): void {
            DB::table('users')->where('id', $user->id)->update([
                'username' => $user->username ?: Str::before($user->email, '@'),
                'display_name' => $user->display_name ?: $user->name,
            ]);
        });

        if (! Schema::hasTable('transactions')) {
            Schema::create('transactions', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('type', 20);
                $table->unsignedBigInteger('amount');
                $table->text('description');
                $table->string('ui_status', 30)->default('belum_selesai');
                $table->string('evidence_path')->nullable();
                $table->dateTime('occurred_at');
                $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('verified_at')->nullable();
                $table->string('verification_status', 30)->default('menunggu');
                $table->text('verification_note')->nullable();
                $table->timestamps();
                $table->index(['type', 'ui_status', 'verification_status', 'occurred_at']);
            });
        }

        if (! Schema::hasTable('debts')) {
            Schema::create('debts', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('party_name');
                $table->string('party_type', 40);
                $table->string('item_name');
                $table->unsignedBigInteger('amount');
                $table->string('status', 30)->default('belum_selesai');
                $table->string('evidence_path')->nullable();
                $table->dateTime('occurred_at');
                $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('verified_at')->nullable();
                $table->string('verification_status', 30)->default('menunggu');
                $table->text('verification_note')->nullable();
                $table->timestamps();
                $table->index(['status', 'verification_status', 'occurred_at']);
            });
        }

        if (! Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('auditable_type');
            $table->unsignedBigInteger('auditable_id');
            $table->string('action', 40);
            $table->json('before_json')->nullable();
            $table->json('after_json')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['auditable_type', 'auditable_id']);
            });
        }

        if (! Schema::hasTable('conversations')) {
            Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participant_a_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('participant_b_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('last_message_at')->nullable();
            $table->timestamps();
            $table->unique(['participant_a_id', 'participant_b_id']);
            });
        }

        if (! Schema::hasTable('messages')) {
            Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->string('context_type')->nullable();
            $table->unsignedBigInteger('context_id')->nullable();
            $table->dateTime('read_at')->nullable();
            $table->timestamps();
            });
        }

        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('debts');
        Schema::dropIfExists('transactions');
    }
};
