import { FontAwesome6 } from "@expo/vector-icons";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";

interface AudioPlayerProps {
  url: string;
  /** When false the player will pause; when true it resumes if it was playing. */
  isActive?: boolean;
}

export const AudioPlayer = ({ url, isActive = true }: AudioPlayerProps) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0); // ms
  const [duration, setDuration] = useState(0); // ms

  // Pulse animation for the play button while active
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Start / stop the pulse ring when playing state changes
  useEffect(() => {
    if (playing) {
      pulseAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseAnim.current.start();
    } else {
      pulseAnim.current?.stop();
      pulse.setValue(1);
    }
  }, [playing]);

  // Pause when the slide is scrolled off-screen
  useEffect(() => {
    if (!isActive && playing && sound) {
      sound.pauseAsync().catch(() => {});
      setPlaying(false);
    }
  }, [isActive]);

  // Unload sound when component is actually unmounted
  useEffect(() => {
    return () => {
      sound?.unloadAsync().catch(() => {});
    };
  }, [sound]);

  const togglePlayback = async () => {
    if (!sound) {
      // First play — create the sound object
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        playThroughEarpieceAndroid: false,
      });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      setSound(newSound);
      setPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        setPosition(status.positionMillis ?? 0);
        setDuration(status.durationMillis ?? 0);
        if (status.didJustFinish) {
          setPlaying(false);
          newSound.setPositionAsync(0);
          setPosition(0);
        }
      });
    } else {
      if (playing) {
        await sound.pauseAsync();
        setPlaying(false);
      } else {
        await sound.playAsync();
        setPlaying(true);
      }
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View className="h-full w-full flex-1 items-center justify-center bg-zinc-900">
      {/* Pulsing ring + play button */}
      <Pressable onPress={togglePlayback} className="items-center justify-center">
        <Animated.View
          style={{ transform: [{ scale: pulse }] }}
          className="size-32 items-center justify-center rounded-full border border-pink-500/30 bg-zinc-800 shadow-2xl"
        >
          {/* Inner glow ring while playing */}
          {playing && (
            <View className="absolute size-32 rounded-full border-2 border-pink-500/20" />
          )}
          <FontAwesome6
            name={playing ? "pause" : "play"}
            size={44}
            color="#ec4899"
            style={{ marginLeft: playing ? 0 : 6 }}
          />
        </Animated.View>
      </Pressable>

      {/* Progress bar */}
      <View className="mt-8 w-64 items-center gap-2">
        <View className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
          <View
            className="h-full rounded-full bg-pink-500"
            style={{ width: `${progress * 100}%` }}
          />
        </View>

        {/* Time labels */}
        <View className="w-full flex-row justify-between">
          <Text className="text-xs text-zinc-500">{formatTime(position)}</Text>
          <Text className="text-xs text-zinc-500">{formatTime(duration)}</Text>
        </View>
      </View>

      <Text className="mt-4 text-sm font-medium tracking-wide text-zinc-400">
        {playing ? "Playing…" : "Tap to Play"}
      </Text>
    </View>
  );
};
