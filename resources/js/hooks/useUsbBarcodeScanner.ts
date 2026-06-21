export function playScanBeep() {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 1200;
        gain.gain.value = 0.08;
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
        osc.onended = () => ctx.close();
    } catch {
        // Abaikan jika browser memblokir audio
    }
}
