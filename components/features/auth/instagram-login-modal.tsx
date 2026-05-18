import { FontAwesome6 } from "@expo/vector-icons";
import CookieManager from "@react-native-cookies/cookies";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSessionExtracted: (sessionId: string, csrfToken?: string, appId?: string) => void;
}

// ─── Static constants ─────────────────────────────────────────────────────────

const IG_LOGIN_URL = "https://www.instagram.com/accounts/login/";
const IG_COOKIE_URL = "https://www.instagram.com";
const IG_HOST = "instagram.com";
const POLLING_INTERVAL_MS = 1000;
const NAV_COOKIE_DELAY_MS = 500;
const ORIGIN_WHITELIST = ["*"];

const USER_AGENT =
  Platform.OS === "android"
    ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
    : "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

const ANDROID_LAYER_TYPE = Platform.OS === "android" ? "software" : "none";

const INJECTED_JAVASCRIPT = `
  (function() {
    try {
      var appId = "936619743392459";
      var match = document.documentElement.innerHTML.match(/(?:"appId"|app_id)["\\s:=]+(\\d{15,})/);
      if (match && match[1]) appId = match[1];
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'IG_APP_ID', appId: appId }));
    } catch (e) {}
  })();
  true;
`;

// ─── Stable class strings ─────────────────────────────────────────────────────

const CLS_MODAL_ROOT = "flex-1 bg-white dark:bg-[#1c2a33]";
const CLS_WEBVIEW = "flex-1 bg-white dark:bg-[#1c2a33]";
const CLS_LOADER_OVERLAY =
  "absolute inset-0 z-50 items-center justify-center bg-white dark:bg-[#1c2a33]";
const CLS_CLOSE_BTN =
  "absolute left-4 z-50 h-10 w-10 items-center justify-center rounded-full bg-black/10 dark:bg-white/10";

// ─── Component ────────────────────────────────────────────────────────────────

export const InstaLoginModal = memo(function InstaLoginModal({
  isOpen,
  onClose,
  onSessionExtracted,
}: Props) {
  const [loading, setLoading] = useState(true);
  const appIdRef = useRef<string | undefined>(undefined);
  const webViewRef = useRef<WebView>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const source = useMemo(() => ({ uri: IG_LOGIN_URL }), []);

  const clearPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const clearNavTimer = useCallback(() => {
    if (navTimerRef.current !== null) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
  }, []);

  const checkNativeCookies = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        await CookieManager.flush();
      }
      const cookies = await CookieManager.get(IG_COOKIE_URL, true);
      if (cookies?.sessionid) {
        clearPolling();
        onSessionExtracted(
          cookies.sessionid.value,
          cookies.csrftoken?.value,
          appIdRef.current,
        );
        onClose();
      }
    } catch {
    }
  }, [clearPolling, onClose, onSessionExtracted]);

  useEffect(() => {
    if (isOpen) {
      pollingRef.current = setInterval(checkNativeCookies, POLLING_INTERVAL_MS);
    } else {
      clearPolling();
      setLoading(true);
    }
    return clearPolling;
  }, [isOpen, checkNativeCookies, clearPolling]);

  useEffect(() => clearNavTimer, [clearNavTimer]);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (!navState.loading && navState.url.includes(IG_HOST)) {
        clearNavTimer();
        navTimerRef.current = setTimeout(checkNativeCookies, NAV_COOKIE_DELAY_MS);
      }
    },
    [checkNativeCookies, clearNavTimer],
  );

  const handleLoadStart = useCallback(() => setLoading(true), []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    checkNativeCookies();
  }, [checkNativeCookies]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string; appId?: string };
      if (data.type === "IG_APP_ID" && data.appId) {
        appIdRef.current = data.appId;
      }
    } catch {}
  }, []);

  return (
    <Modal
      visible={isOpen}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className={CLS_MODAL_ROOT}>
        <SafeAreaView style={{ flex: 1 }}>
          <WebView
            ref={webViewRef}
            source={source}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            injectedJavaScript={INJECTED_JAVASCRIPT}
            onMessage={handleMessage}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            domStorageEnabled
            javaScriptEnabled
            cacheEnabled
            allowsInlineMediaPlayback
            mixedContentMode="always"
            originWhitelist={ORIGIN_WHITELIST}
            setSupportMultipleWindows={false}
            incognito={false}
            className={CLS_WEBVIEW}
            androidLayerType={ANDROID_LAYER_TYPE}
            userAgent={USER_AGENT}
          />

          <Pressable
            onPress={onClose}
            className={CLS_CLOSE_BTN}
            style={{ top: Math.max(insets.top, 16) }}
          >
            <FontAwesome6 name="xmark" size={20} color="#71717a" />
          </Pressable>

          {loading && (
            <View className={CLS_LOADER_OVERLAY}>
              <ActivityIndicator size="large" color="#ec4899" />
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
});
