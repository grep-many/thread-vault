import { Button, Dialog, Input } from "@/components";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, HelpCircle, KeyRound, Logs } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function SessionAuth() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sessionId, setSessionId] = useState("");

  const handleSubmit = async () => {
    if (!sessionId.trim()) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      setTimeout(() => new Promise((resolve) => resolve), 3000); //replace with wroking api
    } catch (err) {
      setErrorMsg("Network error. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-full max-w-md">
            {/* Header */}
            <View className="mb-10 items-center">
              {/* Added overflow-hidden to fix the rounded corners of the gradient */}
              <View className="mb-6 overflow-hidden rounded-3xl shadow-lg shadow-pink-500/50">
                <LinearGradient
                  colors={["#facc15", "#ec4899", "#9333ea"]}
                  className="h-16 w-16 items-center justify-center"
                >
                  <Logs size={28} color="white" />
                </LinearGradient>
              </View>
              <Text className="mb-2 text-4xl font-bold tracking-tight dark:text-white">
                Welcome Back
              </Text>
              <Text className="text-zinc-600 dark:text-zinc-400">
                Connect securely using your session
              </Text>
            </View>

            {/* Card - Added overflow-hidden */}
            <View className="overflow-hidden rounded-4xl border border-black/10 bg-black/5 p-8 shadow-2xl dark:border-white/10 dark:bg-white/5">
              <View className="gap-6">
                <View>
                  <View className="mb-2 flex-row items-center justify-between px-1">
                    <Text className="text-[10px] font-bold tracking-widest text-zinc-700 uppercase dark:text-zinc-500">
                      Session ID Cookie
                    </Text>

                    <Pressable
                      onPress={() => setIsHelpOpen(true)}
                      className="flex-row items-center gap-1"
                    >
                      <HelpCircle size={12} color="#f472b6" />
                      <Text className="text-xs font-medium text-pink-400">How to find?</Text>
                    </Pressable>
                  </View>

                  <Input
                    placeholder="Paste your sessionid..."
                    value={sessionId}
                    onChangeText={setSessionId}
                    icon={<KeyRound size={20} color="#71717a" />}
                  />
                </View>

                <Button
                  variant="gradient"
                  isLoading={isLoading}
                  onPress={handleSubmit}
                  className="w-full py-4"
                >
                  <View className="flex-row items-center justify-center gap-2">
                    <Text className="text-base font-bold text-white">
                      {isLoading ? "Verifying..." : "Validate & Connect"}
                    </Text>
                    {!isLoading && <ArrowRight size={18} color="white" />}
                  </View>
                </Button>

                {!!errorMsg && (
                  <View className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                    <Text className="text-center text-sm font-medium text-red-400">{errorMsg}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Instructional Dialog */}
      <Dialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)}>
        <View className="p-6">
          <View className="mb-4 flex-row items-center gap-2">
            <HelpCircle size={24} color="#ec4899" />
            <Text className="text-xl font-bold dark:text-white">Finding your Session</Text>
          </View>

          <View className="mb-6 space-y-4">
            <HelpStep number="1" text="Log into Instagram in your desktop browser" />
            <HelpStep number="2" text="Press F12 to open Developer Tools" />
            <HelpStep number="3" text="Go to Application > Cookies > instagram.com" />
            <HelpStep number="4" text='Copy the Value of the "sessionid" cookie' />
          </View>

          <Button variant="secondary" className="w-full" onPress={() => setIsHelpOpen(false)}>
            <Text className="dark:text-white">I Understand</Text>
          </Button>
        </View>
      </Dialog>
    </>
  );
}

// Helper for the Dialog list
function HelpStep({ number, text }: { number: string; text: string }) {
  return (
    <View className="flex-row items-start gap-3 py-1">
      <Text className="font-bold text-pink-500">{number}.</Text>
      <Text className="text-sm leading-5 text-zinc-800 dark:text-zinc-300">{text}</Text>
    </View>
  );
}
