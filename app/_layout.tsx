import "@/global.css";
import { useAuthGuard } from "@/hooks/auth/use-auth-guard";
import { ToastProvider } from "@/components/ui/toast";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Prevent splash screen from auto-hiding before auth check completes
SplashScreen.preventAutoHideAsync();

/**
 * Root layout. Its only job is to:
 *  1. Run the auth guard (restores session, validates, routes)
 *  2. Render the navigation stack
 *
 * All auth/routing logic lives in useAuthGuard — keep this file thin.
 */
export default function RootLayout() {
  const theme = useColorScheme();

  // Runs session init + validation + routing + SplashScreen.hideAsync()
  useAuthGuard();

  return (
    <ToastProvider>
      <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
        <StatusBar style={theme === "light" ? "dark" : "light"} />
        <SafeAreaView style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
              freezeOnBlur: true,
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
        </SafeAreaView>
      </View>
    </ToastProvider>
  );
}
