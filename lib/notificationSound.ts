let audioContext: AudioContext | null = null;

// Same two-tone chime used on the chat page (app/user/messages/page.tsx) —
// duplicated rather than imported so this global listener can't regress that
// already-working page if this file changes.
export async function playIncomingMessageSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    if (!audioContext) {
      audioContext = new AudioContextCtor();
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const now = audioContext.currentTime;
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.035, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    const firstTone = audioContext.createOscillator();
    firstTone.type = "sine";
    firstTone.frequency.setValueAtTime(740, now);
    firstTone.frequency.linearRampToValueAtTime(880, now + 0.08);
    firstTone.connect(gainNode);
    firstTone.start(now);
    firstTone.stop(now + 0.16);

    const secondTone = audioContext.createOscillator();
    secondTone.type = "sine";
    secondTone.frequency.setValueAtTime(988, now + 0.08);
    secondTone.connect(gainNode);
    secondTone.start(now + 0.08);
    secondTone.stop(now + 0.28);
  } catch {
    // Browser may block audio before user interaction — ignore.
  }
}
