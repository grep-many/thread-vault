import { AudioPlayer } from "@/components/ui/audio-player";
import { database } from "@/model";
import Inbox from "@/model/inbox";
import Media from "@/model/media";
import { FontAwesome6 } from "@expo/vector-icons";
import { Q } from "@nozbe/watermelondb";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, type LayoutChangeEvent, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const { height: INITIAL_HEIGHT, width: INITIAL_WIDTH } = Dimensions.get("window");

// ─── Static constants ─────────────────────────────────────────────────────────

const VIEWABILITY_CONFIG = { viewAreaCoveragePercentThreshold: 50 } as const;
const MEDIA_PAGE_SIZE = 5;
const INITIAL_MEDIA_SIZE = 6;

const mediaKeyExtractor = (item: Media) => item.itemId;

// ─── Stable class strings ─────────────────────────────────────────────────────

const CLS_SLIDE_ROOT = "relative items-center justify-center bg-black";
const CLS_MEDIA_FULL = "h-full w-full";
const CLS_AVATAR_WRAP =
  "absolute right-6 top-14 h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black/60";
const CLS_LINK_FALLBACK = "items-center justify-center bg-background dark:bg-dark-background";
const CLS_LINK_FALLBACK_TEXT = "mt-3 text-sm text-muted-foreground dark:text-dark-muted-foreground";
const CLS_LOADING = "flex-1 bg-black";
const CLS_ROOT = "flex-1 bg-black";
const CLS_BACK_BTN = "absolute left-6 top-12 z-50 rounded-full bg-black/50 p-3";

// ─── Video slide ──────────────────────────────────────────────────────────────

interface VideoSlideProps {
  url: string;
  thumbnailUrl?: string | null;
  isActive: boolean;
}

const VIDEO_STYLE = { width: "100%", height: "100%" } as const;
const CLS_IMG_FALLBACK = "absolute inset-0 h-full w-full";
const CLS_FALLBACK_WRAP = "items-center justify-center bg-black";
const CLS_FALLBACK_TEXT = "mt-3 text-sm text-muted-foreground";

const VideoSlide = memo(function VideoSlide({ url, thumbnailUrl, isActive }: VideoSlideProps) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = !isActive;
  });

  useEffect(() => {
    if (isActive) {
      player.muted = false;
      player.play();
    } else {
      player.muted = true;
      player.pause();
    }
  }, [isActive, player]);

  return (
    <View style={VIDEO_STYLE}>
      {!!thumbnailUrl && (
        <Image
          source={{ uri: thumbnailUrl }}
          className={CLS_IMG_FALLBACK}
          contentFit="contain"
        />
      )}
      <VideoView
        player={player}
        style={VIDEO_STYLE}
        contentFit="contain"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        nativeControls={false}
      />
    </View>
  );
});

// ─── Isolated media slide ─────────────────────────────────────────────────────

interface MediaSlideProps {
  item: Media;
  isActive: boolean;
  type: string;
  threadPfpUrl: string | null;
  layoutHeight: number;
  layoutWidth: number;
}

const MediaSlide = memo(function MediaSlide({
  item,
  isActive,
  type,
  threadPfpUrl,
  layoutHeight,
  layoutWidth,
}: MediaSlideProps) {
  const targetUrl = item.url || item.thumbnailUrl;

  const isAudio =
    type === "media" &&
    (item.itemType === "voice_media" ||
      !!item.url?.includes(".m4a") ||
      !!item.url?.includes("audio"));

  const isVideo =
    !isAudio &&
    (item.itemType === "video" ||
      item.itemType?.includes("video") ||
      item.itemType === "raven_media" ||
      !!item.url?.includes(".mp4") ||
      !!item.url?.includes("video") ||
      (type === "reel" && !item.url?.match(/\.(jpg|jpeg|png|webp|gif)$/i)));

  const containerStyle = useMemo(
    () => [{ height: layoutHeight, width: layoutWidth }],
    [layoutHeight, layoutWidth],
  );

  const renderContent = () => {
    if (!targetUrl) {
      return (
        <View style={VIDEO_STYLE} className={CLS_FALLBACK_WRAP}>
          <FontAwesome6 name="image" size={36} color="#71717a" />
          <Text className={CLS_FALLBACK_TEXT}>Media Unavailable</Text>
        </View>
      );
    }

    if (type === "link") {
      return <LinkSlide url={targetUrl} layoutHeight={layoutHeight} layoutWidth={layoutWidth} />;
    }

    if (type === "reel" || type === "media") {
      if (isAudio && type === "media") {
        return <AudioPlayer url={targetUrl} isActive={isActive} />;
      }
      
      if (isVideo) {
        return <VideoSlide url={targetUrl} thumbnailUrl={item.thumbnailUrl} isActive={isActive} />;
      }

      const imageSource = item.url 
        ? [{ uri: item.url }, ...(item.thumbnailUrl ? [{ uri: item.thumbnailUrl }] : [])]
        : { uri: targetUrl };

      return (
        <Image
          source={imageSource}
          className={CLS_MEDIA_FULL}
          contentFit="contain"
        />
      );
    }

    return (
      <View style={VIDEO_STYLE} className={CLS_FALLBACK_WRAP}>
        <FontAwesome6 name="circle-exclamation" size={36} color="#71717a" />
        <Text className={CLS_FALLBACK_TEXT}>Unsupported Media Type</Text>
      </View>
    );
  };

  return (
    <View className={CLS_SLIDE_ROOT} style={containerStyle}>
      {renderContent()}

      <View className={CLS_AVATAR_WRAP}>
        {item.isSent ? (
          <FontAwesome6 name="user" size={14} color="white" />
        ) : threadPfpUrl ? (
          <Image source={{ uri: threadPfpUrl }} className={CLS_MEDIA_FULL} />
        ) : (
          <FontAwesome6 name="user" size={14} color="white" />
        )}
      </View>
    </View>
  );
});

// ─── Link slide ───────────────────────────────────────────────────────────────

interface LinkSlideProps {
  url?: string | null;
  layoutHeight: number;
  layoutWidth: number;
}

const LinkSlide = memo(function LinkSlide({ url, layoutHeight, layoutWidth }: LinkSlideProps) {
  const sizeStyle = useMemo(
    () => ({ width: layoutWidth, height: layoutHeight }),
    [layoutWidth, layoutHeight],
  );

  if (!url) {
    return (
      <View style={sizeStyle} className={CLS_LINK_FALLBACK}>
        <FontAwesome6 name="link-slash" size={36} color="#71717a" />
        <Text className={CLS_LINK_FALLBACK_TEXT}>No URL stored for this item</Text>
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

// ─── Main screen ──────────────────────────────────────────────────────────────

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

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  useEffect(() => {
    if (!threadId) return;
    database
      .get<Inbox>("inbox")
      .query(Q.where("thread_id", threadId))
      .fetch()
      .then((threads) => {
        if (threads.length > 0) setThread(threads[0]);
      });
  }, [threadId]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const first = viewableItems[0];
      if (first?.index !== null && first?.index !== undefined) {
        setCurrentIndex(first.index);
      }
    },
  ).current;

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig: VIEWABILITY_CONFIG, onViewableItemsChanged },
  ]).current;

  useEffect(() => {
    if (!threadId || !itemId || !type) return;

    (async () => {
      try {
        const targetItems = await database
          .get<Media>("media")
          .query(Q.where("item_id", itemId))
          .fetch();

        if (!targetItems.length) return;
        const target = targetItems[0];

        const [newer, olderAndTarget] = await Promise.all([
          database
            .get<Media>("media")
            .query(
              Q.where("thread_id", threadId),
              Q.where("type", type),
              Q.where("sent_at", Q.gt(target.sentAt)),
              Q.sortBy("sent_at", Q.asc),
              Q.take(MEDIA_PAGE_SIZE),
            )
            .fetch(),
          database
            .get<Media>("media")
            .query(
              Q.where("thread_id", threadId),
              Q.where("type", type),
              Q.where("sent_at", Q.lte(target.sentAt)),
              Q.sortBy("sent_at", Q.desc),
              Q.take(INITIAL_MEDIA_SIZE),
            )
            .fetch(),
        ]);

        const combined = [...newer.reverse(), ...olderAndTarget];
        setMedia(combined);
        setInitialIndex(combined.findIndex((m) => m.itemId === itemId));
      } catch (err) {
        console.error("[MediaViewer] Error loading media segments:", err);
      } finally {
        setLoading(false);
      }
    })();
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
        Q.take(MEDIA_PAGE_SIZE),
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
        Q.take(MEDIA_PAGE_SIZE),
      )
      .fetch();
    if (newer.length > 0) {
      setMedia((prev) => [...newer.reverse(), ...prev]);
    }
  }, [threadId, type]);

  const handleBack = useCallback(() => router.back(), [router]);

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (e.nativeEvent.contentOffset.y <= 0) loadMoreBefore();
    },
    [loadMoreBefore],
  );

  const threadPfpUrl = thread?.pfpUrl ?? null;

  const renderItem = useCallback(
    ({ item, index }: { item: Media; index: number }) => (
      <MediaSlide
        item={item}
        isActive={currentIndex === index}
        type={type}
        threadPfpUrl={threadPfpUrl}
        layoutHeight={layout.height}
        layoutWidth={layout.width}
      />
    ),
    [currentIndex, type, threadPfpUrl, layout.height, layout.width],
  );

  if (loading || initialIndex === -1) {
    return <View className={CLS_LOADING} />;
  }

  return (
    <View className={CLS_ROOT} onLayout={onLayout}>
      <Pressable onPress={handleBack} className={CLS_BACK_BTN}>
        <FontAwesome6 name="chevron-left" size={18} color="white" />
      </Pressable>

      <FlashList
        data={media}
        keyExtractor={mediaKeyExtractor}
        renderItem={renderItem}
        initialScrollIndex={initialIndex}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreAfter}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
        estimatedItemSize={INITIAL_HEIGHT}
        removeClippedSubviews
        windowSize={3}
        initialNumToRender={INITIAL_MEDIA_SIZE}
        maxToRenderPerBatch={MEDIA_PAGE_SIZE}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
}
