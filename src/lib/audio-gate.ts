import { useCallback, useEffect, useState } from 'react';

let audioUnlocked = false;

export function useAudioGate() {
  const [audioReady, setAudioReady] = useState(audioUnlocked);

  useEffect(() => {
    setAudioReady(audioUnlocked);
  }, []);

  const unlockAudio = useCallback(async () => {
    if (audioUnlocked) {
      setAudioReady(true);
      return true;
    }
    try {
      const AudioContextRef =
        window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextRef) {
        const context = new AudioContextRef();
        const buffer = context.createBuffer(1, 1, 22050);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        if (source.start) source.start(0);
        if (context.state === 'suspended') {
          await context.resume();
        }
      }
      audioUnlocked = true;
      setAudioReady(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { audioReady, unlockAudio };
}
