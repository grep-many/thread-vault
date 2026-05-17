import { FontAwesome6 } from "@expo/vector-icons";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";

interface AudioPlayerProps {
  url: string;
  isActive?: boolean;
}

const AUDIO_MODE = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  interruptionModeIOS: InterruptionModeIOS.DuckOthers,
  shouldDuckAndroid: true,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  playThroughEarpieceAndroid: false,
} as const;

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PULSE_SEQUENCE_DURATION = 600;
const PLAY_ICON_OFFSET = { marginLeft: 6 } as const;
const NO_OFFSET = {} as const;

export const AudioPlayer = memo(function AudioPlayer({
  url,
  isActive = true,
}: AudioPlayerProps) {

  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const pulse = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (playing) {
      pulseAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.15,
            duration: PULSE_SEQUENCE_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: PULSE_SEQUENCE_DURATION,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnim.current.start();
    } else {
      pulseAnim.current?.stop();
      pulse.setValue(1);
    }
  }, [playing, pulse]);

  // Pause when scrolled off-screen — use ref to avoid stale closure
  useEffect(() => {
    if (!isActive && soundRef.current) {
      soundRef.current.pauseAsync().catch(() => {});
      setPlaying(false);
    }
  }, [isActive]);

  // Unload on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const togglePlayback = useCallback(async () => {
    if (!soundRef.current) {
      await Audio.setAudioModeAsync(AUDIO_MODE);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
      );
      soundRef.current = newSound;

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
        await soundRef.current.pauseAsync();
        setPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setPlaying(true);
      }
    }
  }, [playing, url]);

  const progress = duration > 0 ? position / duration : 0;
  const progressWidth = `${progress * 100}%` as const;
  const iconOffset = playing ? NO_OFFSET : PLAY_ICON_OFFSET;

  return (
    <View className="flex-1 items-center justify-center bg-zinc-900 dark:bg-zinc-950">
      <Pressable onPress={togglePlayback} className="items-center justify-center">
        <Animated.View
          className="h-32 w-32 items-center justify-center rounded-full border border-pink-500/30 bg-zinc-800 shadow-lg shadow-black/40"
          style={{ transform: [{ scale: pulse }] }}
        >
          {playing && <View className="absolute h-32 w-32 rounded-full border-2 border-pink-500/20" />}
          <FontAwesome6
            name={playing ? "pause" : "play"}
            size={44}
            color="#ec4899"
            style={iconOffset}
          />
        </Animated.View>
      </Pressable>

      <View className="mt-8 w-64 items-center gap-2">
        <View className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
          <View className="h-full rounded-full bg-pink-500" style={{ width: progressWidth }} />
        </View>

        <View className="w-full flex-row justify-between">
          <Text className="text-xs text-zinc-400">{formatTime(position)}</Text>
          <Text className="text-xs text-zinc-400">{formatTime(duration)}</Text>
        </View>
      </View>

      <Text className="mt-4 text-sm font-medium tracking-wide text-zinc-400">
        {playing ? "Playing…" : "Tap to Play"}
      </Text>
    </View>
  );
});
