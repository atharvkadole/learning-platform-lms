import {
  Archive,
  Code2,
  Download,
  ExternalLink,
  File,
  FileImage,
  FileText,
  GitBranch,
  HardDrive,
  Link,
  PlayCircle,
  Video,
} from "lucide-react";

export function getMaterialIcon(type) {
  const icons = {
    VIDEO: PlayCircle,
    VIDEO_FILE: PlayCircle,
    YOUTUBE_VIDEO: Video,
    PDF: FileText,
    MARKDOWN: FileText,
    SLIDES: File,
    EXTERNAL_LINK: ExternalLink,
    ARTICLE: FileText,
    CODE_SNIPPET: Code2,
    GITHUB_REPOSITORY: GitBranch,
    GOOGLE_DRIVE: HardDrive,
    DROPBOX: HardDrive,
    ONEDRIVE: HardDrive,
    ZIP: Archive,
    IMAGE: FileImage,
    INTERNAL_UPLOAD: Download,
    ATTACHMENT: Download,
  };
  return icons[type] || Link;
}

export function getMaterialActionLabel(type) {
  if (["PDF", "ZIP", "IMAGE", "VIDEO_FILE", "ATTACHMENT", "INTERNAL_UPLOAD"].includes(type)) return "Open";
  if (type === "CODE_SNIPPET") return "View";
  if (type === "GITHUB_REPOSITORY") return "Repository";
  return "Open";
}

export function getMaterialTypeLabel(type) {
  return String(type || "MATERIAL").replaceAll("_", " ");
}

export function canOpenMaterial(material) {
  return Boolean(material?.contentUrl);
}
