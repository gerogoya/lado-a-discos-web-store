import { createSupabaseBrowserClient } from "./client";
import { defaultHomepageContent, type HeroAction, type Homepage, type HomepageContent, type HomepageSection } from "@/types/homepage";

type ContentRow = {
  eyebrow: string; heading: string; body: string; hero_image_storage_path: string;
  hero_image_alt: string; actions: unknown; trust_items: unknown; trust_strip_visible: boolean;
  info_eyebrow: string; info_heading: string; info_body: string; info_section_visible: boolean; updated_at: string;
};
type SectionRow = { id: string; title: string; body: string; visible: boolean; sort_order: number };

function validActions(value: unknown): HeroAction[] {
  if (!Array.isArray(value) || value.length !== 2) return defaultHomepageContent.actions;
  return value.map((item, index) => {
    const candidate = item && typeof item === "object" ? item as Partial<HeroAction> : {};
    return {
      id: index === 0 ? "primary" : "secondary",
      label: typeof candidate.label === "string" ? candidate.label : defaultHomepageContent.actions[index].label,
      href: typeof candidate.href === "string" ? candidate.href : defaultHomepageContent.actions[index].href,
      visible: candidate.visible !== false
    };
  });
}

function mapContent(row: ContentRow): HomepageContent {
  return {
    eyebrow: row.eyebrow, heading: row.heading, body: row.body,
    heroImageStoragePath: row.hero_image_storage_path, heroImageAlt: row.hero_image_alt,
    actions: validActions(row.actions),
    trustItems: Array.isArray(row.trust_items) ? row.trust_items.filter((item): item is string => typeof item === "string") : defaultHomepageContent.trustItems,
    trustStripVisible: row.trust_strip_visible !== false,
    infoEyebrow: row.info_eyebrow ?? defaultHomepageContent.infoEyebrow,
    infoHeading: row.info_heading ?? defaultHomepageContent.infoHeading,
    infoBody: row.info_body ?? defaultHomepageContent.infoBody,
    infoSectionVisible: row.info_section_visible !== false,
    updatedAt: row.updated_at
  };
}

export async function getHomepage(includeHidden = false): Promise<Homepage> {
  const client = createSupabaseBrowserClient();
  const contentRequest = client.from("homepage_content").select("eyebrow,heading,body,hero_image_storage_path,hero_image_alt,actions,trust_items,trust_strip_visible,info_eyebrow,info_heading,info_body,info_section_visible,updated_at").eq("id", true).single();
  let sectionsRequest = client.from("homepage_sections").select("id,title,body,visible,sort_order").order("sort_order").order("id");
  if (!includeHidden) sectionsRequest = sectionsRequest.eq("visible", true);
  const [contentResult, sectionsResult] = await Promise.all([contentRequest, sectionsRequest]);
  if (contentResult.error) throw contentResult.error;
  if (sectionsResult.error) throw sectionsResult.error;
  return {
    content: mapContent(contentResult.data as unknown as ContentRow),
    sections: (sectionsResult.data as unknown as SectionRow[]).map(row => ({
      id: row.id, title: row.title, body: row.body, visible: row.visible, sortOrder: row.sort_order
    }))
  };
}

export function homepageImageUrl(storagePath: string) {
  if (!storagePath) return "";
  return createSupabaseBrowserClient().storage.from("site-assets").getPublicUrl(storagePath).data.publicUrl;
}

export async function uploadHomepageImage(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const storagePath = `homepage/hero-${crypto.randomUUID()}.${extension}`;
  const { error } = await createSupabaseBrowserClient().storage.from("site-assets").upload(storagePath, file, {
    contentType: file.type, upsert: false, cacheControl: "3600"
  });
  if (error) throw error;
  return storagePath;
}

export async function saveHomepage(content: HomepageContent, sections: HomepageSection[]) {
  const { data, error } = await createSupabaseBrowserClient().rpc("save_homepage", {
    expected_updated_at: content.updatedAt || null,
    content: {
      eyebrow: content.eyebrow, heading: content.heading, body: content.body,
      hero_image_storage_path: content.heroImageStoragePath, hero_image_alt: content.heroImageAlt,
      actions: content.actions, trust_items: content.trustItems, trust_strip_visible: content.trustStripVisible,
      info_eyebrow: content.infoEyebrow, info_heading: content.infoHeading, info_body: content.infoBody,
      info_section_visible: content.infoSectionVisible
    },
    sections: sections.map((section, index) => ({
      id: section.id, title: section.title, body: section.body, visible: section.visible, sort_order: index
    }))
  });
  if (error) throw error;
  return mapContent(data as unknown as ContentRow);
}

export async function removeHomepageImage(storagePath: string) {
  if (!storagePath) return;
  const { error } = await createSupabaseBrowserClient().storage.from("site-assets").remove([storagePath]);
  if (error) throw error;
}
