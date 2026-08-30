import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/explore"],
      disallow: ["/api/", "/dashboard", "/trips", "/stats"],
    },
  }
}
