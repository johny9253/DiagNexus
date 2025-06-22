// Environment configuration
export const config = {
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  showDebugInfo: process.env.NEXT_PUBLIC_SHOW_DEBUG === "true",
  showStatusBanners: process.env.NEXT_PUBLIC_SHOW_STATUS_BANNERS === "true",

  // Feature flags for different environments
  features: {
    showMockDataBanner: process.env.NODE_ENV === "development",
    showDatabaseStatus: process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_SHOW_DEBUG === "true",
    showS3Status: process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_SHOW_DEBUG === "true",
    showTechnicalDetails: process.env.NODE_ENV === "development",
  },
}
