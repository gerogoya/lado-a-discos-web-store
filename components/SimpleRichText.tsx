import { Fragment, type ReactNode } from "react";
import { publicAsset } from "@/lib/assets";

export function isSafeContentHref(href: string) {
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href.trim()) && !/^\/\//.test(href.trim());
}

export function contentHref(href: string) {
  const trimmed = href.trim();
  return trimmed.startsWith("/") ? publicAsset(trimmed) : trimmed;
}

function inline(value: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    if (match.index > cursor) parts.push(value.slice(cursor, match.index));
    if (match[1]) parts.push(<strong key={`${match.index}-b`}>{match[1]}</strong>);
    else if (isSafeContentHref(match[3])) parts.push(<a key={`${match.index}-a`} href={contentHref(match[3])}>{match[2]}</a>);
    else parts.push(match[0]);
    cursor = pattern.lastIndex;
  }
  if (cursor < value.length) parts.push(value.slice(cursor));
  return parts;
}

export function SimpleRichText({ value, className }: { value: string; className?: string }) {
  return <p className={className}>{value.split("\n").map((line, index) => <Fragment key={index}>{index > 0 && <br />}{inline(line)}</Fragment>)}</p>;
}
