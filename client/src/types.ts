export interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface TranslationStatus {
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  subtitles?: Subtitle[];
  error?: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration: string;
  progress: number;
  status: string;
  subtitles: Subtitle[];
  translations: {
    [key: string]: TranslationStatus;
  };
  detected_language?: string;
}
