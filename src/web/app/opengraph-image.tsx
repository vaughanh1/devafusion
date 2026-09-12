import { ImageResponse } from "next/og";

import { BrandSocialImage } from "@/components/brand/brand-social-image";

export const alt = "Devafusion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<BrandSocialImage />, { ...size });
}
