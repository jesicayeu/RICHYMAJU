<?php

return [
    'base_url' => rtrim(env('WAHA_BASE_URL', 'http://waha:3000'), '/'),
    'api_key' => env('WAHA_API_KEY'),
    'webhook_base_url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/webhooks/waha',
];
