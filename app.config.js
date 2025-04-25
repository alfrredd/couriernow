export default ({ config }) => ({
  ...config,
  android: {
    package: "com.jose.couriernow",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./android/app/google-services.json"
  },
  extra: {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    ...config.extra,
  },
});
