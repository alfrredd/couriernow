// global.d.ts
declare namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SUPABASE_URL?: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
      // Add any other custom env vars here
    }
  }