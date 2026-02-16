import { useRef, useEffect } from 'react';

/**
 * Component to handle audio notifications for new orders
 * Uses Web Audio API to generate notification sound
 */
const NotificationSound = ({ play, onEnd }) => {
  const audioContextRef = useRef(null);

  useEffect(() => {
    // Initialize Audio Context
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (play && audioContextRef.current) {
      playNotificationSound();
      if (onEnd) {
        setTimeout(onEnd, 1000); // Call onEnd after sound completes
      }
    }
  }, [play, onEnd]);

  const playNotificationSound = () => {
    const audioContext = audioContextRef.current;

    if (!audioContext) return;

    // Create a pleasant notification sound (two-tone beep)
    const playTone = (frequency, startTime, duration) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      // Envelope for smooth sound
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0.1, startTime + duration - 0.01);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioContext.currentTime;

    // Play two pleasant tones
    playTone(800, now, 0.15);           // First tone
    playTone(1000, now + 0.2, 0.15);    // Second tone (higher pitch)
    playTone(800, now + 0.4, 0.15);     // Third tone (back to first pitch)
  };

  return null; // This component doesn't render anything
};

export default NotificationSound;
