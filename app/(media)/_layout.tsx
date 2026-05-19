import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCREEN_OPTIONS = {
  headerShown: false,
  animation: "fade",
} as const;

const SAFE_AREA_STYLE = { flex: 1 } as const;

export default function MediaLayout() {
  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      <SafeAreaView style={SAFE_AREA_STYLE} className="flex-1 bg-black">
        <Stack screenOptions={SCREEN_OPTIONS} />
      </SafeAreaView>
    </View>
  );
}
