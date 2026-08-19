import { AudioIcon } from '@/components/icons/AudioIcon';
import { FileIcon } from '@/components/icons/FileIcon';
import { VideoIcon } from '@/components/icons/VideoIcon';

/** Подбирает иконку файла по префиксу MIME-типа (video/*, audio/*, остальное — документ). */
export function getFileIcon(
  mimeType: string,
  props?: React.SVGProps<SVGSVGElement>,
) {
  if (mimeType.startsWith('video/')) return <VideoIcon {...props} />;
  if (mimeType.startsWith('audio/')) return <AudioIcon {...props} />;
  return <FileIcon {...props} />;
}
