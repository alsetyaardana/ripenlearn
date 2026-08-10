import type { MetadataRoute } from "next";

const BASE = "https://ripenlearn.web.id";

const routes = ["/", "/metodologi", "/kurikulum", "/eksperimen", "/referensi", "/tentang", "/harga", "/blog", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
