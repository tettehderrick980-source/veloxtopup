// Type definitions for Deno standard library modules
// This file exists only to satisfy TypeScript during development

declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export interface RequestInfo {
    url: string;
    method: string;
    headers: Headers;
    body?: ReadableStream | null;
  }

  export function serve(handler: (req: Request) => Promise<Response>): void;
  export class Response {
    constructor(body?: BodyInit | null, init?: ResponseInit);
    body: ReadableStream | null;
    headers: Headers;
    ok: boolean;
    redirected: boolean;
    status: number;
    statusText: string;
    type: ResponseType;
    url: string;
    clone(): Response;
  }

  export interface ResponseInit {
    status?: number;
    statusText?: string;
    headers?: HeadersInit;
  }
}

declare module "https://deno.land/std@0.177.0/http/mod.ts" {
  export * from "https://deno.land/std@0.177.0/http/server.ts";
}

// Global Web API types that Deno provides
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};
