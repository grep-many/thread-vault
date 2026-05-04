import { FontAwesome6 } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

export const AudioPlayer = ({ url }: { url: string }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const togglePlayback = async () => {
    if (!sound) {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: url });
      setSound(newSound);
      await newSound.playAsync();
      setPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false);
          newSound.setPositionAsync(0);
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

  return (
    <Pressable
      onPress={togglePlayback}
      className="h-full w-full flex-1 items-center justify-center bg-zinc-900"
    >
      <View className="size-32 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 shadow-2xl">
        <FontAwesome6
          name={playing ? "pause" : "play"}
          size={48}
          color="#ec4899"
          style={{ marginLeft: playing ? 0 : 8 }}
        />
      </View>
      <Text className="mt-6 font-medium tracking-wide text-zinc-400">
        {playing ? "Playing..." : "Tap to Play"}
      </Text>
    </Pressable>
  );
};
