<?php

return [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect_uri' => env('GOOGLE_REDIRECT_URI', env('APP_URL').'/admin/google-drive/callback'),

    'folders' => [
        'chat' => env('GOOGLE_DRIVE_FOLDER_CHAT', '1rg9s8c3fWOCN7XchB-5vSpQHhEsgWcr2'),
        'stocks' => env('GOOGLE_DRIVE_FOLDER_STOCKS', '1XOsiByHFDqgxpMQLvKyxTPN94NeVBsX4'),
        'transactions' => env('GOOGLE_DRIVE_FOLDER_TRANSACTIONS', '1kW5Yx9PqlW89rflyHNUb8mbFT1saetwD'),
        'debts' => env('GOOGLE_DRIVE_FOLDER_DEBTS', '10MoyTWS9qzCnEH0_Cf0HTm2sHEsHr2hy'),
        'profile' => env('GOOGLE_DRIVE_FOLDER_PROFILE', ''),
    ],
];
