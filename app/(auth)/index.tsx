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
import { useState } from "react";
import { Pressable, ScrollView, Text, View, Image } from "react-native";
import { router } from "expo-router";
import { ICONPNG } from "@/constants";

export default function LoginScreen() {
  const [activeTab, setActiveTab] = useState<"insta" | "manual">("insta");
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInstaModalOpen, setIsInstaModalOpen] = useState(false);

  const sessionId = useSession((state) => state.sessionId);
  const setSession = useSession((state) => state.setSession);

  async function onSessionReceived(id: string, csrf?: string, appId?: string) {
    setIsLoading(true);
    console.log("[LoginScreen] Session extracted:", id);

    try {
      // Persist credentials before validation so validateSession can read them
      setSession(id, csrf, appId);

      const { isValid, hasExistingData } = await validateSession(id, csrf, appId);

      if (isValid) {
        if (!hasExistingData) {
          useSync.getState().syncInbox();
        }
        router.replace("/inbox");
      } else {
        console.log("[LoginScreen] Session invalid — credentials and DB cleared.");
      }
    } catch (e) {
      console.error("[LoginScreen] Session validation error:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConnect() {
    if (activeTab === "insta") {
      setIsInstaModalOpen(true);
    } else {
      if (sessionId) {
        await onSessionReceived(sessionId);
      }
    }
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-zinc-50 dark:bg-zinc-950">
      <View className="flex-1 items-center justify-center p-6">
        <View className="w-full max-w-md">
          {/* Header */}
          <View className="mb-8 items-center">
            <View className="mb-6 overflow-hidden rounded-3xl shadow-lg shadow-pink-500/50">
              <LinearGradient
                colors={["#facc15", "#ec4899", "#9333ea"]}
                className="h-16 w-16 items-center justify-center"
              >
                <Image source={ICONPNG} className="h-16 w-16" />
              </LinearGradient>
            </View>
            <Text className="mb-2 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
              ThreadsVault
            </Text>
            <Text className="text-zinc-600 dark:text-zinc-400">
              Choose your preferred connection method
            </Text>
          </View>

          {/* Tab Slider */}
          <View className="mb-8 flex-row rounded-2xl bg-zinc-200/50 p-1 dark:bg-white/5">
            <TabButton
              active={activeTab === "insta"}
              label="Login"
              icon="instagram"
              onPress={() => setActiveTab("insta")}
            />
            <TabButton
              active={activeTab === "manual"}
              label="Manual"
              icon="key"
              onPress={() => setActiveTab("manual")}
            />
          </View>

          {/* Main Content Card */}
          <View className="overflow-hidden rounded-4xl border bg-white p-8 shadow-xl dark:border-white/10 dark:bg-white/5">
            {activeTab === "insta" ? (
              <View className="gap-6">
                <View className="items-center py-4">
                  <View className="mb-4 rounded-full bg-pink-500/10 p-4">
                    <FontAwesome6 name="instagram" size={32} color="#ec4899" />
                  </View>
                  <Text className="text-center leading-6 text-zinc-600 dark:text-zinc-400">
                    Connect securely using the official Instagram login flow. No cookies required.
                  </Text>
                </View>

                <Button variant="gradient" isLoading={isLoading} onPress={handleConnect}>
                  <FontAwesome6 name="instagram" size={18} color="white" />
                  <Text className="font-bold text-white">Login with Instagram</Text>
                </Button>

                <InstaLoginModal
                  isOpen={isInstaModalOpen}
                  onClose={() => setIsInstaModalOpen(false)}
                  onSessionExtracted={onSessionReceived}
                />
              </View>
            ) : (
              <View className="gap-6">
                <View>
                  <View className="mb-3 flex-row items-center justify-between px-1">
                    <Text className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                      Session ID Cookie
                    </Text>
                    <Pressable
                      onPress={() => setIsHelpOpen(true)}
                      className="flex-row items-center gap-1"
                    >
                      <FontAwesome6 name="circle-question" size={14} color="#f472b6" />
                      <Text className="text-xs font-semibold text-pink-500">Guide</Text>
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

      <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </ScrollView>
  );
}
