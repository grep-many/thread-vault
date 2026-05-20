import { FontAwesome6 } from "@expo/vector-icons";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";

interface AudioPlayerProps {
  url: string;
  isActive?: boolean;
}

// ─── Static constants ─────────────────────────────────────────────────────────

const AUDIO_MODE = {
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,
  interruptionModeIOS: InterruptionModeIOS.DuckOthers,
  shouldDuckAndroid: true,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  playThroughEarpieceAndroid: false,
} as const;

// ─── Stable style objects ─────────────────────────────────────────────────────

const PLAY_ICON_OFFSET = { marginLeft: 4 } as const;
const NO_OFFSET = {} as const;

// ─── Stable class strings ─────────────────────────────────────────────────────


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AudioPlayer = memo(function AudioPlayer({
  url,
  isActive = true,
}: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (!isActive && soundRef.current) {
      soundRef.current.pauseAsync().catch(() => {});
      setPlaying(false);
    }
  }, [isActive]);

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
    <View className="flex-1 w-full items-center justify-center bg-black">
      <View className="items-center justify-center gap-12">
        <FontAwesome6
          name="music"
          size={48}
          color="white"
          className="mb-4 opacity-80"
        />

        <Pressable onPress={togglePlayback} className="items-center justify-center active:opacity-80">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-white/10">
            <FontAwesome6
              name={playing ? "pause" : "play"}
              size={32}
              color="white"
              style={iconOffset}
            />
          </View>
        </Pressable>

        <View className="w-72 px-4">
          <View className="relative justify-center">
            <View className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <View className="h-full rounded-full bg-white" style={{ width: progressWidth }} />
            </View>
            <View className="absolute -top-1.5 h-4 w-4 rounded-full bg-white shadow-sm shadow-black/50" style={{ left: progressWidth, marginLeft: -8 }} />
          </View>

          <View className="mt-3 flex-row justify-between w-full">
            <Text className="text-xs font-medium text-white/60 tracking-widest">{formatTime(position)}</Text>
            <Text className="text-xs font-medium text-white/60 tracking-widest">{formatTime(duration)}</Text>
          </View>
        </View>

        <Text className="mt-6 text-sm font-semibold text-white/50 tracking-widest uppercase">
          {playing ? "Playing" : "Paused"}
        </Text>
      </View>
    </View>
  );
});
