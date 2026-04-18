import {
  // SplashScreen,
  Stack,
} from "expo-router";
import "@/global.css";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
// import { useEffect } from "react";

// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // useEffect(() => {
  //   (async () => {
  //     await new Promise((resolve, reject) => setTimeout(resolve, 20000))
  //     SplashScreen.hideAsync();
  //   })()
  // },[])

  return (
    <View className="flex-1 bg-white dark:bg-black">
      {/* This is the base layer */}
      <LinearGradient
        colors={["#09090b", "#18181b", "#000000"]}
        className="absolute inset-0 opacity-10"
      />

      {/* Set edges to top to avoid double-padding at the bottom if using tabs */}
      <SafeAreaView style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" }, // CRITICAL for Expo Router
          }}
        />
      </SafeAreaView>
    </View>
  );
}
