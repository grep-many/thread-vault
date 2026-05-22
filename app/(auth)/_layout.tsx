import "@/global.css";
import { useAuthGuard } from "@/hooks/auth/use-auth-guard";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

const SCREEN_OPTIONS = {
  headerShown: false,
  animation: "fade",
  freezeOnBlur: true,
  contentStyle: { backgroundColor: "transparent" },
} as const;

const SAFE_AREA_STYLE = { flex: 1 } as const;

export default function AuthLayout() {
  const theme = useColorScheme();
  useAuthGuard();

  return (
    <View className="bg-background dark:bg-dark-background flex-1">
      <StatusBar style={theme === "light" ? "dark" : "light"} />
      <SafeAreaView style={SAFE_AREA_STYLE}>
        <Stack screenOptions={SCREEN_OPTIONS} />
      </SafeAreaView>
    </View>
  );
}
