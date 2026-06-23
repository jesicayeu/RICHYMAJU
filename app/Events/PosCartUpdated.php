<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PosCartUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public int $userId,
        public array $payload,
        public ?string $clientId = null,
    ) {}

    /**
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('pos-cart.'.$this->userId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'PosCartUpdated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'client_id' => $this->clientId,
            'updated_at' => $this->payload['updatedAt'] ?? now()->toIso8601String(),
            'cart' => $this->payload['cart'] ?? [],
            'paymentMethod' => $this->payload['paymentMethod'] ?? 'tunai',
            'cashPaid' => $this->payload['cashPaid'] ?? '',
        ];
    }
}
