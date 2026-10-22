// src/utils/adminAlertSound.js

/**
 * Web Audio API 기반 어드민 실시간 알림음 엔진
 * 브라우저 자동재생 정책(Autoplay Policy) 완벽 방어 및 맑고 선명한 2단 차임벨(딩~동~)
 */
let audioCtx = null;
let isUnlocked = false;

export const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    return audioCtx;
};

// 🔓 사용자 최초 클릭/터치/키입력 시 브라우저 오디오 권한 자동 언락(Unlock)
export const unlockAudioContext = async () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        isUnlocked = true;
    } catch (e) {
        console.warn("오디오 컨텍스트 언락 대기 중:", e);
    }
};

if (typeof window !== 'undefined') {
    const handleFirstGesture = async () => {
        await unlockAudioContext();
        window.removeEventListener('click', handleFirstGesture);
        window.removeEventListener('touchstart', handleFirstGesture);
        window.removeEventListener('keydown', handleFirstGesture);
    };
    window.addEventListener('click', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true, passive: true });
}

/**
 * 맑고 품격 있는 2단 차임벨(딩~동~) 알림 사운드 재생
 */
export const playAdminNotificationSound = async () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        // 브라우저에 의해 일시 중지된 상태라면 안전하게 재개 대기
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const now = ctx.currentTime;

        // 1음 ("딩~" : Sol - G5, 784Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(783.99, now);

        gain1.gain.setValueAtTime(0.5, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // 2음 ("동~" : Do - C6, 1046.5Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, now + 0.18);

        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.setValueAtTime(0.6, now + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.18);
        osc2.stop(now + 1.1);

    } catch (e) {
        console.warn("오디오 알림음 재생 불가:", e);
    }
};
