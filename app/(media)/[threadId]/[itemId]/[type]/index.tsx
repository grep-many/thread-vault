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
import { createVideoPlayer, type VideoPlayer, VideoView } from "expo-video";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, type LayoutChangeEvent, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const { height: INITIAL_HEIGHT, width: INITIAL_WIDTH } = Dimensions.get("window");
const FULL_SIZE = { width: "100%", height: "100%" } as const;
const FULLSCREEN_OPTIONS = { enable: false } as const;
const WEBVIEW_DARK_SCRIPT = `
  document.documentElement.style.backgroundColor = "black";
  document.body.style.backgroundColor = "black";
  true;
`;

type MediaKind = "video" | "image" | "audio" | "link";

const keyExtractor = (item: Media) => item.itemId;

function getMediaKind(item: Media): MediaKind {
  if (item.type === "link") return "link";
  if (
    item.itemType === "voice_media" ||
    item.url?.includes(".m4a") ||
    item.url?.includes("audio")
  ) {
    return "audio";
  }
  if (item.url?.includes(".mp4") || item.url?.includes("video")) return "video";
  return "image";
}

const VideoSlide = memo(function VideoSlide({ url, isActive }: { url: string; isActive: boolean }) {
  const playerRef = useRef<VideoPlayer | null>(null);

  if (!playerRef.current) {
    const player = createVideoPlayer({ uri: url });
    player.loop = true;
    player.muted = true;
    player.pause();
    playerRef.current = player;
  }

  const player = playerRef.current;

  useEffect(() => {
    if (isActive) {
      player.muted = false;
      player.play();
    } else {
      player.muted = true;
      player.pause();
    }
  }, [isActive, player]);

  useEffect(() => {
    return () => {
      playerRef.current?.pause();
      playerRef.current?.release();
      playerRef.current = null;
    };
  }, []);

  if (!player) return null;

  return (
    <VideoView
      player={player}
      style={FULL_SIZE}
      contentFit="contain"
      nativeControls={false}
      fullscreenOptions={FULLSCREEN_OPTIONS}
      allowsPictureInPicture={false}
    />
  );
});

function LinkSlide({ url, width, height }: { url?: string | null; width: number; height: number }) {
  const [loading, setLoading] = useState(true);

  if (!url) {
    return (
      <View style={{ width, height }} className="items-center justify-center bg-black">
        <FontAwesome6 name="link-slash" size={36} color="#71717a" />
        <Text className="mt-3 text-sm text-zinc-500">No URL stored for this item</Text>
      </View>
    );
  }

  return (
    <View style={{ width, height, backgroundColor: "black" }}>
      <WebView
        source={{ uri: url }}
        style={{ width, height, backgroundColor: "black" }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        scrollEnabled
        injectedJavaScript={WEBVIEW_DARK_SCRIPT}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && <View className="absolute inset-0 items-center justify-center bg-black" />}
    </View>
  );
}

const MediaItem = memo(function MediaItem({
  item,
  isActive,
  threadPfpUrl,
  width,
  height,
}: {
  item: Media;
  isActive: boolean;
  threadPfpUrl?: string | null;
  width: number;
  height: number;
}) {
  const kind = getMediaKind(item);

  return (
    <View style={{ width, height }} className="relative items-center justify-center bg-black">
      {kind === "audio" ? (
        <AudioPlayer url={item.url} isActive={isActive} />
      ) : kind === "video" && item.url ? (
        <VideoSlide key={item.itemId} url={item.url} isActive={isActive} />
      ) : kind === "link" ? (
        <LinkSlide url={item.url} width={width} height={height} />
      ) : (
        <Image source={{ uri: item.url }} style={FULL_SIZE} contentFit="contain" />
      )}

      <View className="absolute top-14 right-6 h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/60">
        {item.isSent ? (
          <FontAwesome6 name="user" size={14} color="white" />
        ) : threadPfpUrl ? (
          <Image source={{ uri: threadPfpUrl }} style={FULL_SIZE} />
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

  useKeepAwake();

  const [media, setMedia] = useState<Media[]>([]);
  const [thread, setThread] = useState<Inbox | null>(null);
  const [initialIndex, setInitialIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [layout, setLayout] = useState({ width: INITIAL_WIDTH, height: INITIAL_HEIGHT });
  const mediaRef = useRef<Media[]>([]);
  mediaRef.current = media;

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
    const { width, height } = e.nativeEvent.layout;
    setLayout((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
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
        const targetIndex = combined.findIndex((m) => m.itemId === itemId);
        setMedia(combined);
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

  const renderItem = useCallback(
    ({ item, index }: { item: Media; index: number }) => (
      <MediaItem
        item={item}
        isActive={currentIndex === index}
        threadPfpUrl={thread?.pfpUrl}
        width={layout.width}
        height={layout.height}
      />
    ),
    [currentIndex, layout.height, layout.width, thread?.pfpUrl],
  );

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
        keyExtractor={keyExtractor}
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
        renderItem={renderItem}
        extraData={currentIndex}
        estimatedItemSize={layout.height}
        getItemType={getMediaKind}
        removeClippedSubviews
      />
    </View>
  );
}
