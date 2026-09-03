"use client";

import Image from "next/image";
import { publicAsset } from "@/lib/assets";

type ProductImageProps = {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  loading?: "eager" | "lazy";
  priority?: boolean;
};

export function ProductImage({ src, alt, width, height, className, loading, priority }: ProductImageProps) {
  const imageSrc = src || publicAsset("/brand/lado-a-discos-logo.jpg");

  if (imageSrc.startsWith("data:")) {
    return <img src={imageSrc} alt={alt} width={width} height={height} className={className} loading={loading} />;
  }

  return <Image src={imageSrc} alt={alt} width={width} height={height} className={className} loading={loading} priority={priority} />;
}
