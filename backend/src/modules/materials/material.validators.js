import { z } from "zod";

export const materialTypes = [
  "VIDEO",
  "VIDEO_FILE",
  "PDF",
  "MARKDOWN",
  "SLIDES",
  "EXTERNAL_LINK",
  "ARTICLE",
  "CODE_SNIPPET",
  "GITHUB_REPOSITORY",
  "YOUTUBE_VIDEO",
  "GOOGLE_DRIVE",
  "DROPBOX",
  "ONEDRIVE",
  "ZIP",
  "IMAGE",
  "INTERNAL_UPLOAD",
  "ATTACHMENT",
];

function isUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function isInternalReference(value) {
  return value?.startsWith("internal://");
}

function hostIncludes(value, hosts) {
  try {
    const url = new URL(value);
    return hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function hasExtension(value, extensions) {
  try {
    const url = new URL(value);
    return extensions.some((extension) => url.pathname.toLowerCase().endsWith(extension));
  } catch {
    return extensions.some((extension) => value.toLowerCase().endsWith(extension));
  }
}

const linkRequiredTypes = [
  "VIDEO",
  "VIDEO_FILE",
  "PDF",
  "SLIDES",
  "EXTERNAL_LINK",
  "GITHUB_REPOSITORY",
  "YOUTUBE_VIDEO",
  "GOOGLE_DRIVE",
  "DROPBOX",
  "ONEDRIVE",
  "ZIP",
  "IMAGE",
  "INTERNAL_UPLOAD",
  "ATTACHMENT",
];

function validateMaterialReference(value, context, { requireContentUrl }) {
  const contentUrl = value.contentUrl;

  if (value.type && linkRequiredTypes.includes(value.type) && !contentUrl && requireContentUrl) {
    context.addIssue({
      code: "custom",
      path: ["contentUrl"],
      message: "Content URL is required for this material type",
    });
    return;
  }

  if (!contentUrl) return;
  const internal = isInternalReference(contentUrl);
  if (!internal && !isUrl(contentUrl)) {
    context.addIssue({ code: "custom", path: ["contentUrl"], message: "Enter a valid URL" });
    return;
  }

  if (!value.type) return;

  const checks = {
    GITHUB_REPOSITORY: () => hostIncludes(contentUrl, ["github.com"]),
    YOUTUBE_VIDEO: () => hostIncludes(contentUrl, ["youtube.com", "youtu.be"]),
    GOOGLE_DRIVE: () => hostIncludes(contentUrl, ["drive.google.com", "docs.google.com"]),
    DROPBOX: () => hostIncludes(contentUrl, ["dropbox.com"]),
    ONEDRIVE: () => hostIncludes(contentUrl, ["1drv.ms", "onedrive.live.com"]),
    PDF: () => internal || hasExtension(contentUrl, [".pdf"]),
    ZIP: () => internal || hasExtension(contentUrl, [".zip"]),
    IMAGE: () => internal || hasExtension(contentUrl, [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]),
  };

  if (checks[value.type] && !checks[value.type]()) {
    context.addIssue({
      code: "custom",
      path: ["contentUrl"],
      message: `Content URL does not match ${value.type.replaceAll("_", " ").toLowerCase()} requirements`,
    });
  }
}

const materialBase = z.object({
  moduleId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(materialTypes),
  contentUrl: z.string().trim().max(2048).optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  displayOrder: z.number().int().default(0),
});

const materialBody = materialBase.superRefine((value, context) =>
  validateMaterialReference(value, context, { requireContentUrl: true }),
);

export const createMaterialSchema = z.object({ body: materialBody });
export const updateMaterialSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: materialBase.partial().superRefine((value, context) =>
    validateMaterialReference(value, context, { requireContentUrl: Boolean(value.type) }),
  ),
});
export const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });
