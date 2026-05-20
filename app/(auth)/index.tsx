import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabButton } from "@/components/ui/tab-button";
import { HelpDialog } from "@/components/features/auth/help-dialog";
import { InstaLoginModal } from "@/components/features/auth/instagram-login-modal";
import { useSession } from "@/hooks/auth/use-session";
import { validateSession } from "@/hooks/auth/use-validate-session";
import { useSync } from "@/hooks/sync/use-sync";
import { FontAwesome6 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View, Image } from "react-native";
import { router } from "expo-router";
import { ICONPNG } from "@/constants";

// ─── Atomic selectors ─────────────────────────────────────────────────────────

const selectSessionId = (s: ReturnType<typeof useSession.getState>) => s.sessionId;
const selectSetSession = (s: ReturnType<typeof useSession.getState>) => s.setSession;

// ─── Static constants ─────────────────────────────────────────────────────────

const GRADIENT_COLORS = ["#facc15", "#ec4899", "#9333ea"] as const;
const SCROLL_CONTENT_STYLE = { flexGrow: 1 } as const;
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

// ─── Stable class strings ─────────────────────────────────────────────────────


// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<"insta" | "manual">("insta");
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInstaModalOpen, setIsInstaModalOpen] = useState(false);

  const sessionId = useSession(selectSessionId);
  const setSession = useSession(selectSetSession);

  const onSessionReceived = useCallback(
    async (id: string, csrf?: string, appId?: string) => {
      setIsLoading(true);
      try {
        setSession(id, csrf, appId);
        const { isValid, hasExistingData } = await validateSession(id, csrf, appId);
        if (isValid) {
          if (!hasExistingData) {
            useSync.getState().syncInbox();
          }
          router.replace("/inbox");
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    },
    [setSession],
  );

  const handleConnect = useCallback(async () => {
    if (activeTab === "insta") {
      setIsInstaModalOpen(true);
    } else if (sessionId) {
      await onSessionReceived(sessionId);
    }
  }, [activeTab, sessionId, onSessionReceived]);

  const handleSetActiveInsta = useCallback(() => setActiveTab("insta"), []);
  const handleSetActiveManual = useCallback(() => setActiveTab("manual"), []);
  const handleOpenHelp = useCallback(() => setIsHelpOpen(true), []);
  const handleCloseHelp = useCallback(() => setIsHelpOpen(false), []);
  const handleCloseInstaModal = useCallback(() => setIsInstaModalOpen(false), []);

  return (
    <ScrollView contentContainerStyle={SCROLL_CONTENT_STYLE} className="bg-background dark:bg-dark-background">
      <View className="flex-1 items-center justify-center p-6">
        <View className="w-full max-w-md">
          <View className="mb-8 items-center">
            <View className="mb-6 overflow-hidden rounded-3xl shadow-lg shadow-primary/50">
              <LinearGradient colors={GRADIENT_COLORS} className="h-16 w-16 items-center justify-center">
                <Image source={ICONPNG} className="h-16 w-16" />
              </LinearGradient>
            </View>
            <Text className="mb-2 text-4xl font-bold tracking-tight text-foreground dark:text-dark-foreground">ThreadsVault</Text>
            <Text className="text-muted-foreground dark:text-dark-muted-foreground">
              Choose your preferred connection method
            </Text>
          </View>

          <View className="mb-8 flex-row rounded-2xl bg-muted/50 p-1.5 dark:bg-dark-muted/30">
            <TabButton
              active={activeTab === "insta"}
              label="Login"
              icon="instagram"
              onPress={handleSetActiveInsta}
            />
            <TabButton
              active={activeTab === "manual"}
              label="Manual"
              icon="key"
              onPress={handleSetActiveManual}
            />
          </View>

          <View className="overflow-hidden rounded-4xl border border-border bg-card p-8 shadow-xl dark:border-dark-border dark:bg-dark-card">
            {activeTab === "insta" ? (
              <View className="gap-6">
                <View className="items-center py-4">
                  <View className="mb-4 rounded-full bg-primary/10 p-4">
                    <FontAwesome6 name="instagram" size={32} color="#ec4899" />
                  </View>
                  <Text className="text-center leading-6 text-muted-foreground dark:text-dark-muted-foreground">
                    Connect securely using the official Instagram login flow. No cookies required.
                  </Text>
                </View>

                <Button variant="gradient" isLoading={isLoading} onPress={handleConnect}>
                  <FontAwesome6 name="instagram" size={18} color="white" />
                  <Text className="font-bold text-white">Login with Instagram</Text>
                </Button>

                <InstaLoginModal
                  isOpen={isInstaModalOpen}
                  onClose={handleCloseInstaModal}
                  onSessionExtracted={onSessionReceived}
                />
              </View>
            ) : (
              <View className="gap-6">
                <View>
                  <View className="mb-3 flex-row items-center justify-between px-1">
                    <Text className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase dark:text-dark-muted-foreground">Session ID Cookie</Text>
                    <Pressable
                      onPress={handleOpenHelp}
                      className="flex-row items-center gap-1"
                      hitSlop={HIT_SLOP}
                    >
                      <FontAwesome6 name="circle-question" size={14} color="#f472b6" />
                      <Text className="text-xs font-semibold text-primary">Guide</Text>
                    </Pressable>
                  </View>

                  <Input
                    placeholder="Paste sessionid..."
                    value={sessionId ?? ""}
                    onChangeText={setSession}
                    icon={<FontAwesome6 name="key" size={16} color="#71717a" />}
                  />
                </View>

                <Button variant="gradient" isLoading={isLoading} onPress={handleConnect}>
                  <Text className="font-bold text-white">Validate Session</Text>
                  <FontAwesome6 name="arrow-right" size={16} color="white" />
                </Button>
              </View>
            )}
          </View>
        </View>
      </View>

      <HelpDialog isOpen={isHelpOpen} onClose={handleCloseHelp} />
    </ScrollView>
  );
}
