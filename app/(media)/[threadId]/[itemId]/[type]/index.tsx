import { AudioPlayer } from "@/components/ui/audio-player";
import { database } from "@/model";
import Inbox from "@/model/inbox";
import Media from "@/model/media";
import { FontAwesome6 } from "@expo/vector-icons";
import { Q } from "@nozbe/watermelondb";
import { FlashList } from "@shopify/flash-list";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS, ResizeMode, Video } from "expo-av";
import { Image } from "expo-image";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, LayoutChangeEvent, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const { height: INITIAL_HEIGHT, width: INITIAL_WIDTH } = Dimensions.get("window");

export default function MediaViewer() {
  const { threadId, itemId, type } = useLocalSearchParams<{
    threadId: string;
    itemId: string;
    type: string;
  }>();
  const router = useRouter();

  // Keep the screen awake while browsing media
  useKeepAwake();

  const [media, setMedia] = useState<Media[]>([]);
  const [thread, setThread] = useState<Inbox | null>(null);
  const [initialIndex, setInitialIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [layout, setLayout] = useState({ width: INITIAL_WIDTH, height: INITIAL_HEIGHT });

  // Configure audio session: duck/pause on phone call, resume after
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setLayout({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  }, []);

  useEffect(() => {
    if (!threadId) return;
    const fetchThread = async () => {
      const threads = await database
        .get<Inbox>("inbox")
        .query(Q.where("thread_id", threadId))
        .fetch();
      if (threads.length > 0) setThread(threads[0]);
    };
    fetchThread();
  }, [threadId]);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      if (viewableItems && viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;
  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]).current;

  useEffect(() => {
    if (!threadId || !itemId || !type) return;
    const loadInitial = async () => {
      try {
        const targetItem = await database
          .get<Media>("media")
          .query(Q.where("item_id", itemId))
          .fetch();
        if (!targetItem.length) return;
        const target = targetItem[0];

        const newer = await database
          .get<Media>("media")
          .query(
            Q.where("thread_id", threadId),
            Q.where("type", type),
            Q.where("sent_at", Q.gt(target.sentAt)),
            Q.sortBy("sent_at", Q.asc),
            Q.take(5),
          )
          .fetch();

        const olderAndTarget = await database
          .get<Media>("media")
          .query(
            Q.where("thread_id", threadId),
            Q.where("type", type),
            Q.where("sent_at", Q.lte(target.sentAt)),
            Q.sortBy("sent_at", Q.desc),
            Q.take(6),
          )
          .fetch();

        const combined = [...newer.reverse(), ...olderAndTarget];
        setMedia(combined);
        setInitialIndex(combined.findIndex((m) => m.itemId === itemId));
      } catch (err) {
        console.error("[MediaViewer] Error loading media segments:", err);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, [threadId, itemId, type]);

  const loadMoreAfter = useCallback(async () => {
    if (!media.length) return;
    const lastItem = media[media.length - 1];
    const older = await database
      .get<Media>("media")
      .query(
        Q.where("thread_id", threadId),
        Q.where("type", type),
        Q.where("sent_at", Q.lt(lastItem.sentAt)),
        Q.sortBy("sent_at", Q.desc),
        Q.take(5),
      )
      .fetch();
    if (older.length > 0) {
      setMedia((prev) => [...prev, ...older]);
    }
  }, [media, threadId, type]);

  const loadMoreBefore = useCallback(async () => {
    if (!media.length) return;
    const firstItem = media[0];
    const newer = await database
      .get<Media>("media")
      .query(
        Q.where("thread_id", threadId),
        Q.where("type", type),
        Q.where("sent_at", Q.gt(firstItem.sentAt)),
        Q.sortBy("sent_at", Q.asc),
        Q.take(5),
      )
      .fetch();
    if (newer.length > 0) {
      setMedia((prev) => [...newer.reverse(), ...prev]);
    }
  }, [media, threadId, type]);

  if (loading || initialIndex === -1) {
    return <View className="flex-1 bg-black" />;
  }

  return (
    <View className="flex-1 bg-black" onLayout={onLayout}>
      <Pressable
        onPress={() => router.back()}
        className="absolute top-12 left-6 z-50 rounded-full bg-black/50 p-3 shadow-md backdrop-blur-md"
      >
        <FontAwesome6 name="chevron-left" size={18} color="white" />
      </Pressable>

      <FlashList
        data={media}
        keyExtractor={(item) => item.itemId}
        initialScrollIndex={initialIndex}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreAfter}
        onEndReachedThreshold={0.5}
        onScroll={(e) => {
          if (e.nativeEvent.contentOffset.y <= 0) {
            loadMoreBefore();
          }
        }}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
        renderItem={({ item, index }) => {
          const isActive = currentIndex === index;
          const isAudio =
            item.itemType === "voice_media" ||
            item.url?.includes(".m4a") ||
            item.url?.includes("audio");
          const isVideo =
            !isAudio && (item.url?.includes(".mp4") || item.url?.includes("video"));

          return (
            <View
              style={{ height: layout.height, width: layout.width }}
              className="relative items-center justify-center bg-black"
            >
              {isAudio ? (
                <AudioPlayer url={item.url} isActive={isActive} />
              ) : isVideo ? (
                <Video
                  source={{ uri: item.url }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={isActive}
                  isLooping
                  isMuted={!isActive}
                  useNativeControls={false}
                />
              ) : type === "link" ? (
                <LinkSlide url={item.url} layout={layout} />
              ) : (
                <Image
                  source={{ uri: item.url }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="contain"
                />
              )}

              {/* Sender/receiver avatar */}
              <View className="absolute top-14 right-6 h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/60">
                {item.isSent ? (
                  <FontAwesome6 name="user" size={14} color="white" />
                ) : thread?.pfpUrl ? (
                  <Image
                    source={{ uri: thread.pfpUrl }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <FontAwesome6 name="user" size={14} color="white" />
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

// ─── In-app link browser slide ────────────────────────────────────────────────

function LinkSlide({ url, layout }: { url?: string | null; layout: { width: number; height: number } }) {
  if (!url) {
    return (
      <View
        style={{ width: layout.width, height: layout.height }}
        className="items-center justify-center bg-zinc-950"
      >
        <FontAwesome6 name="link-slash" size={36} color="#71717a" />
        <Text className="mt-3 text-sm text-zinc-500">No URL stored for this item</Text>
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: url }}
      style={{ width: layout.width, height: layout.height }}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      scrollEnabled
    />
  );
}
