"use client";

import Image from "next/image";

type ProductImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  loading?: "eager" | "lazy";
  priority?: boolean;
};

export function ProductImage({ src, alt, width, height, className, loading, priority }: ProductImageProps) {
  if (src.startsWith("data:")) {
    return <img src={src} alt={alt} width={width} height={height} className={className} loading={loading} />;
  }

  return <Image src={src} alt={alt} width={width} height={height} className={className} loading={loading} priority={priority} />;
}
