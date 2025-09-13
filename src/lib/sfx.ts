export function playActionSfx(volume: number = 0.6): void {
  try {
    const audio = new Audio('/create_a_smooth_soun-1757789522862.mp3');
    audio.volume = volume;
    void audio.play().catch(() => {});
  } catch {
    // ignore
  }
}


