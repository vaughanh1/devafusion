import type { MetadataRoute } from "next";

import { engineeringLog } from "@/features/log/engineering-log";
import { projects } from "@/features/projects/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://devafusion.net";

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/accessibility",
    "/projects",
    "/experiments",
    "/contact",
    "/legal",
    "/log",
    "/tech-stack",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));

  // Log entries carry their own real date, so the sitemap reflects actual
  // content change dates instead of a build-time timestamp - a stale
  // lastModified on every deploy causes Google to deprioritize recrawling
  // pages it believes it just saw.
  const logRoutes: MetadataRoute.Sitemap = engineeringLog.map((entry) => ({
    url: `${baseUrl}/log/${entry.slug}`,
    lastModified: new Date(entry.date),
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${baseUrl}/projects/${project.slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...logRoutes, ...projectRoutes];
}
