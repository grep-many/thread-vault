import { useState } from "react";
import { View, Modal, ActivityIndicator, Platform, StyleSheet } from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import CookieManager from "@react-native-cookies/cookies";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSessionExtracted: (sessionId: string) => void;
}

export function InstaLoginModal({ isOpen, onClose, onSessionExtracted }: Props) {
  const [loading, setLoading] = useState(true);

  const checkNativeCookies = async () => {
    try {
      // 1. IMPORTANT: Flush cookies from RAM to Disk for Android
      if (Platform.OS === "android") {
        await CookieManager.flush();
      }

      // 2. Get cookies for the main domain (more reliable than the full redirect URL)
      const cookies = await CookieManager.get("https://www.instagram.com", true);

      console.log("[IG-AUTH] Current Cookies:", Object.keys(cookies));

      if (cookies && cookies.sessionid) {
        const sid = cookies.sessionid.value;
        console.log("[IG-AUTH] Session ID Found!");
        onSessionExtracted(sid);
        onClose();
      }
    } catch (error: unknown) {
      console.error(
        `[IG-AUTH] Cookie Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url, loading: isNavLoading } = navState;

    // Trigger check when navigation settles on an Instagram page
    if (!isNavLoading && url.includes("instagram.com")) {
      setTimeout(checkNativeCookies, 1000);
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white dark:bg-[#1c2a33]">
        <SafeAreaView style={{ flex: 1 }}>
          <WebView
            source={{ uri: "https://www.instagram.com/accounts/login/" }}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => {
              setLoading(false);
              checkNativeCookies();
            }}
            // Cookie configurations
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            style={{ flex: 1 }}
            // Android Stability
            androidLayerType={Platform.OS === "android" ? "software" : "none"}
            userAgent={
              Platform.OS === "android"
                ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
                : "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            }
          />

          {loading && (
            <View
              style={StyleSheet.absoluteFill}
              className="z-50 items-center justify-center bg-white dark:bg-[#1c2a33]"
            >
              <ActivityIndicator size="large" color="#3897f0" />
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
