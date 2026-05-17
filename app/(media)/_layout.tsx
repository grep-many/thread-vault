import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

const SCREEN_OPTIONS = {
  headerShown: false,
  animation: "fade",
} as const;

export default function MediaLayout() {
  return (
    <View className="flex-1 bg-dark-background">
      <StatusBar style="light" />
      <Stack screenOptions={SCREEN_OPTIONS} />
    </View>
  );
}
