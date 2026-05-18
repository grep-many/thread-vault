import { AudioPlayer } from "@/components/ui/audio-player";
import { database } from "@/model";
import Inbox from "@/model/inbox";
import Media from "@/model/media";
import { FontAwesome6 } from "@expo/vector-icons";
import { Q } from "@nozbe/watermelondb";
import { FlashList } from "@shopify/flash-list";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { Image } from "expo-image";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, type LayoutChangeEvent, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const { height: INITIAL_HEIGHT, width: INITIAL_WIDTH } = Dimensions.get("window");
const MEDIA_STYLE = { width: "100%", height: "100%" } as const;
const DISABLED_FULLSCREEN_OPTIONS = { enable: false } as const;

const keyExtractor = (item: Media) => item.itemId;
const getItemType = (item: Media) => item.itemType || "unknown";

const VideoItem = memo(function VideoItem({
  url,
  isActive,
}: {
  url: string;
  isActive: boolean;
}) {
  const player = useVideoPlayer(url, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = !isActive;
  });

  useEffect(() => {
    if (isActive) {
      player.muted = false;
      player.play();
      return;
    }

    player.muted = true;
    player.pause();
  }, [isActive, player]);

  return (
    <VideoView
      player={player}
      style={MEDIA_STYLE}
      contentFit="contain"
      nativeControls={false}
      fullscreenOptions={DISABLED_FULLSCREEN_OPTIONS}
      allowsPictureInPicture={false}
    />
  );
});

const MediaItem = memo(function MediaItem({
  item,
  isActive,
  type,
  threadPfpUrl,
  layout,
}: {
  item: Media;
  isActive: boolean;
  type: string;
  threadPfpUrl?: string | null;
  layout: { width: number; height: number };
}) {
  const isAudio =
    item.itemType === "voice_media" ||
    item.url?.includes(".m4a") ||
    item.url?.includes("audio");
  const isVideo =
    !isAudio && (item.url?.includes(".mp4") || item.url?.includes("video"));

  const itemStyle = useMemo(
    () => ({ height: layout.height, width: layout.width }),
    [layout.height, layout.width],
  );

  return (
    <View
      style={itemStyle}
      className="relative items-center justify-center bg-black"
    >
      {isAudio ? (
        <AudioPlayer url={item.url} isActive={isActive} />
      ) : isVideo && item.url ? (
        <VideoItem url={item.url} isActive={isActive} />
      ) : type === "link" ? (
        <LinkSlide url={item.url} layout={layout} />
      ) : (
        <Image
          source={{ uri: item.url }}
          style={MEDIA_STYLE}
          contentFit="contain"
        />
      )}

      {/* Sender/receiver avatar */}
      <View className="absolute top-14 right-6 h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/60">
        {item.isSent ? (
          <FontAwesome6 name="user" size={14} color="white" />
        ) : threadPfpUrl ? (
          <Image
            source={{ uri: threadPfpUrl }}
            style={MEDIA_STYLE}
          />
        ) : (
          <FontAwesome6 name="user" size={14} color="white" />
        )}
      </View>
    </View>
  );
});

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
  const mediaRef = useRef<Media[]>([]);
  mediaRef.current = media;

  // Configure audio session: duck/pause on phone call, resume after
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
    }).catch(() => { });
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout((prev) => (
      prev.width === width && prev.height === height ? prev : { width, height }
    ));
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
      const nextIndex = viewableItems[0]?.index;
      if (nextIndex !== null && nextIndex !== undefined) {
        setCurrentIndex((prev) => (prev === nextIndex ? prev : nextIndex));
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
        const targetIndex = combined.findIndex((m) => m.itemId === itemId);
        setInitialIndex(targetIndex);
        setCurrentIndex(targetIndex);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, [threadId, itemId, type]);

  const loadMoreAfter = useCallback(async () => {
    const current = mediaRef.current;
    if (!current.length) return;
    const lastItem = current[current.length - 1];
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
  }, [threadId, type]);

  const loadMoreBefore = useCallback(async () => {
    const current = mediaRef.current;
    if (!current.length) return;
    const firstItem = current[0];
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
  }, [threadId, type]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (e.nativeEvent.contentOffset.y <= 0) {
        loadMoreBefore();
      }
    },
    [loadMoreBefore],
  );

  const threadPfpUrl = thread?.pfpUrl ?? null;

  const renderItem = useCallback(
    ({ item, index }: { item: Media; index: number }) => (
      <MediaItem
        item={item}
        isActive={currentIndex === index}
        type={type}
        threadPfpUrl={threadPfpUrl}
        layout={layout}
      />
    ),
    [currentIndex, layout, threadPfpUrl, type],
  );

  if (loading || initialIndex === -1) {
    return <View className="flex-1 bg-black" />;
  }

  return (
    <View className="flex-1 bg-black" onLayout={onLayout}>
      <Pressable
        onPress={handleBack}
        className="absolute top-12 left-6 z-50 rounded-full bg-black/50 p-3 shadow-md backdrop-blur-md"
      >
        <FontAwesome6 name="chevron-left" size={18} color="white" />
      </Pressable>

      <FlashList
        data={media}
        keyExtractor={keyExtractor}
        initialScrollIndex={initialIndex}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreAfter}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
        renderItem={renderItem}
        estimatedItemSize={layout.height}
        getItemType={getItemType}
        removeClippedSubviews
      />
    </View>
  );
}

// ─── In-app link browser slide ────────────────────────────────────────────────

const LinkSlide = memo(function LinkSlide({
  url,
  layout,
}: {
  url?: string | null;
  layout: { width: number; height: number };
}) {
  const sizeStyle = useMemo(
    () => ({ width: layout.width, height: layout.height }),
    [layout.height, layout.width],
  );

  if (!url) {
    return (
      <View
        style={sizeStyle}
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
      style={sizeStyle}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      scrollEnabled
    />
  );
});
