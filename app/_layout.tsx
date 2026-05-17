import "@/global.css";
import { useAuthGuard } from "@/hooks/auth/use-auth-guard";
import { ToastProvider } from "@/components/ui/toast";
import { SplashScreen, Stack } from "expo-router";
import { useColorScheme } from "react-native";

SplashScreen.preventAutoHideAsync();

const SCREEN_OPTIONS = {
  headerShown: false,
  animation: "fade",
  freezeOnBlur: true,
  contentStyle: { backgroundColor: "transparent" },
} as const;

export default function RootLayout() {
  const theme = useColorScheme();
  useAuthGuard();

  return (
    <ToastProvider>
      <Stack screenOptions={SCREEN_OPTIONS} />
    </ToastProvider>
  );
}
