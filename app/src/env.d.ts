// env.d.ts
interface ImportMetaEnv {
    XAI_API_KEY: string;
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    // Add other environment variables as needed
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

// Type declarations for external modules
declare module 'html-docx-js/dist/html-docx' {
  const htmlDocx: any;
  export default htmlDocx;
}