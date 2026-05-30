<x-mail::message>
# Reset Password

Halo{{ $name ? ', **'.$name.'**' : '' }}!

Anda menerima email ini karena ada permintaan reset password untuk akun **Richy Maju**.

<x-mail::button :url="$url">
Reset Password
</x-mail::button>

Link di atas berlaku selama **{{ $expireMinutes }} menit**.

Jika Anda tidak meminta reset password, abaikan email ini. Permintaan link baru dapat dilakukan lagi setelah **1 menit**.

Terima kasih,<br>
{{ config('mail.from.name', 'Richy Maju') }}

<x-slot:subcopy>
Jika tombol tidak berfungsi, salin dan tempel URL berikut ke browser Anda:<br>
<span class="break-all">{{ $url }}</span>
</x-slot:subcopy>
</x-mail::message>
