import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { View, Text } from "react-native";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  "Log into Instagram on a desktop browser",
  "Right-click and select 'Inspect' (F12)",
  "Navigate to Application > Cookies",
  "Find and copy the 'sessionid' value",
] as const;

// ─── Stable class strings ─────────────────────────────────────────────────────


export const HelpDialog = memo(function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Manual Setup Guide">
      <View className="gap-4">
        {STEPS.map((step, i) => (
          <View key={i} className="flex-row items-start gap-3">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-primary/10">
              <Text className="text-xs font-bold text-primary">{i + 1}</Text>
            </View>
            <Text className="flex-1 text-foreground dark:text-dark-foreground">{step}</Text>
          </View>
        ))}
        <Button variant="secondary" className="mt-4" onPress={onClose}>
          <Text className="font-bold text-foreground dark:text-dark-foreground">
            Got it, thanks!
          </Text>
        </Button>
      </View>
    </Dialog>
  );
});
