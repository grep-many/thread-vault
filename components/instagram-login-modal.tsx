import React, { useRef, useState, useEffect } from "react";
import { View, Modal, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { X } from "lucide-react-native";
import CookieManager from "@react-native-cookies/cookies";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSessionExtracted: (sessionId: string) => void;
}

export function InstaLoginModal({ isOpen, onClose, onSessionExtracted }: Props) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState(0);

  // Force a fresh WebView instance every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setSessionKey((prev) => prev + 1);
      setLoading(true);
    }
  }, [isOpen]);

  const checkNativeCookies = async (url: string) => {
    try {
      // 'true' uses the specialized Android CookieManager bridge
      const cookies = await CookieManager.get(url, true);

      if (cookies && cookies.sessionid) {
        const sid = cookies.sessionid.value;
        console.log("[NativeCookie] SUCCESS: sessionid extracted.");
        onSessionExtracted(sid);
        onClose();
      }
    } catch (error) {
      // Silently fail during transitions to avoid console noise
    }
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url, loading: isNavLoading } = navState;

    if (!isNavLoading && url.includes("instagram.com")) {
      // Small delay ensures the native OS jar is updated after the redirect
      setTimeout(() => checkNativeCookies(url), 1000);
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white dark:bg-zinc-950">
        {/* Headless Floating Close Button */}
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          className="absolute top-14 right-6 z-[100] h-10 w-10 items-center justify-center rounded-full bg-black/50"
        >
          <X size={20} color="white" />
        </TouchableOpacity>

        <View className="flex-1">
          <WebView
            key={`webview-${sessionKey}`}
            ref={webViewRef}
            source={{ uri: "https://www.instagram.com/accounts/login/" }}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={(e) => {
              setLoading(false);
              checkNativeCookies(e.nativeEvent.url);
            }}
            // Native Cookie Sync Settings
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            // UI & Scaling
            scalesPageToFit={true}
            style={{ flex: 1 }}
            // Performance/Stability for Android Emulators
            androidLayerType={Platform.OS === "android" ? "hardware" : "none"}
            userAgent={
              Platform.OS === "android"
                ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
                : "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
            }
          />

          {loading && (
            <View
              pointerEvents="none"
              className="absolute inset-0 z-50 items-center justify-center bg-white dark:bg-zinc-950"
            >
              <ActivityIndicator size="large" color="#ec4899" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
