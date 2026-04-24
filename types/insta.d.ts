interface InboxChats {
  thread_id: string;
  thread_title: string;
  username: string;
}

export interface InboxMedia {
  item_id: string;
  message_id: string;
  user_id: string;
  timestamp: number;
  item_type:
    | "text"
    | "media"
    | "voice_media"
    | "animated_media"
    | "clip"
    | "reel_share"
    | "media_share"
    | "link";
  is_sent_by_viewer: boolean;
  client_context: string;

  // Base fields present in almost all objects
  user?: InstagramUser;

  // Type-specific payloads
  text?: string;

  media?: {
    id: string;
    media_type: number;
    image_versions2: {
      candidates: ImageCandidate[];
    };
  };

  voice_media?: {
    media: {
      id: string;
      audio: {
        audio_src: string;
        duration: number;
        audio_src_expiration_timestamp_us: number;
        waveform_data: number[];
      };
    };
  };

  animated_media?: {
    id: string;
    images: {
      fixed_height: {
        url: string;
        mp4?: string;
        webp?: string;
      };
    };
    is_sticker: boolean;
  };

  clip?: {
    clip: InstagramMediaClip;
  };

  reel_share?: {
    text?: string;
    type: string;
    media: InstagramMediaClip;
  };

  direct_media_share?: {
    media: InstagramMediaClip & {
      carousel_media?: any[];
      carousel_media_count?: number;
    };
  };

  link?: {
    text: string;
    link_context: {
      link_url: string;
      link_title: string;
      link_image_url: string;
    };
  };

  replied_to_message?: Partial<InboxMedia>;
}

// Support Interfaces for nested data
interface InstagramUser {
  id: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  is_verified: boolean;
  is_private: boolean;
}

interface ImageCandidate {
  width: number;
  height: number;
  url: string;
  url_expiration_timestamp_us?: number;
}

interface InstagramMediaClip {
  id: string;
  pk: string;
  code: string;
  media_type: number;
  image_versions2: {
    candidates: ImageCandidate[];
  };
  video_versions?: {
    url: string;
    width: number;
    height: number;
  }[];
  video_duration?: number;
}
