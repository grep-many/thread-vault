import { useCallback, useRef, useState } from "react";
import { Modal, View, ActivityIndicator, Platform } from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import CookieManager from "@react-native-cookies/cookies";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSessionExtracted: (sessionId: string, csrfToken?: string, appId?: string) => void;
}

const IG_LOGIN_URL = "https://www.instagram.com/accounts/login/";
const IG_COOKIE_URL = "https://www.instagram.com";
const IG_HOST = "instagram.com";

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

const WV_SOURCE = { uri: IG_LOGIN_URL } as const;

export function InstaLoginModal({ isOpen, onClose, onSessionExtracted }: Props) {
  const [loading, setLoading] = useState(true);
  const appIdRef = useRef<string | undefined>(undefined);

  const checkNativeCookies = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        await CookieManager.flush();
      }
      const cookies = await CookieManager.get(IG_COOKIE_URL, true);
      if (cookies?.sessionid) {
        onSessionExtracted(
          cookies.sessionid.value,
          cookies.csrftoken?.value,
          appIdRef.current,
        );
        onClose();
      }
    } catch (error: unknown) {
      console.error(
        `[IG-AUTH] Cookie Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }, [onClose, onSessionExtracted]);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      if (!navState.loading && navState.url.includes(IG_HOST)) {
        setTimeout(checkNativeCookies, 1000);
      }
    },
    [checkNativeCookies],
  );

  const handleLoadStart = useCallback(() => setLoading(true), []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    checkNativeCookies();
  }, [checkNativeCookies]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "IG_APP_ID" && data.appId) {
        appIdRef.current = data.appId;
      }
    } catch {
      console.error("[IG-AUTH] Message parse error");
    }
  }, []);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        <SafeAreaView className="flex-1">
          <WebView
            source={WV_SOURCE}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            injectedJavaScript={INJECTED_JAVASCRIPT}
            onMessage={handleMessage}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            domStorageEnabled
            javaScriptEnabled
            className="flex-1"
            androidLayerType={ANDROID_LAYER_TYPE}
            userAgent={USER_AGENT}
          />
          {loading && (
            <View className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
              <ActivityIndicator size="large" className="text-primary" />
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
