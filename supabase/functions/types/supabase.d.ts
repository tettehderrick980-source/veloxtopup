// Type declarations for Deno edge function imports
declare module "https://esm.sh/@supabase/supabase-js@2.39.0" {
  export function createClient(url: string, key: string, options?: any): any;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(url: string, key: string, options?: any): any;
}

declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response>): void;
}
