export function phoneToChatId(phone: string | null | undefined): string | null {
    if (!phone?.trim()) {
        return null;
    }

    let digits = phone.replace(/\D/g, '');

    if (!digits) {
        return null;
    }

    if (digits.startsWith('0')) {
        digits = `62${digits.slice(1)}`;
    } else if (!digits.startsWith('62')) {
        digits = `62${digits.replace(/^0+/, '')}`;
    }

    return `${digits}@c.us`;
}
