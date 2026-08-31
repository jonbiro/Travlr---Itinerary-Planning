import type { MetadataRoute } from "next"
import { getSiteUrl, isPreviewDeployment } from "@/lib/site-url"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  if (isPreviewDeployment()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    }
  }

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/explore"],
      disallow: ["/api/", "/dashboard", "/trips", "/stats"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  }
}
