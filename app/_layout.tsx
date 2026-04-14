import {
  // SplashScreen,
  Stack
} from "expo-router";
import "@/global.css";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
// import { useEffect } from "react";

// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // useEffect(() => {
  //   (async () => {
  //     await new Promise((resolve, reject) => setTimeout(resolve, 20000))
  //     SplashScreen.hideAsync();
  //   })()
  // },[])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colorScheme === "dark" ? "#000" : "#fff" }}>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}
