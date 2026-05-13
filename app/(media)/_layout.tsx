import { Stack } from "expo-router";
import { StatusBar, View } from "react-native";

export default function MediaLayout() {
  return (
    <View className="flex-1 bg-zinc-950">
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      />
    </View>
  );
}
