import { router, SplashScreen, Stack } from "expo-router";
import "@/global.css";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSession } from "@/hooks";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const init = useSession((state) => state.init);
  const theme = useColorScheme();

  useEffect(() => {
    (async () => {
      await init();
      router.replace("/");
      SplashScreen.hideAsync();
    })();
  }, []);

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <StatusBar style={theme === "light" ? "dark" : "light"} translucent />
      {/* Set edges to top to avoid double-padding at the bottom if using tabs */}
      <SafeAreaView style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
            freezeOnBlur: true,
            contentStyle: { backgroundColor: "transparent" }, // CRITICAL for Expo Router
          }}
        />
      </SafeAreaView>
    </View>
  );
}
