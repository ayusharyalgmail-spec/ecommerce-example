// Build-time stand-in for @supabase/realtime-js (see vite.config.ts alias).
// supabase-js always constructs a RealtimeClient, which drags about 25 kB gzip (realtime-js + phoenix) into the storefront
// entry even though the storefront never uses Realtime. This stub implements only the surface supabase-js calls, so
// nothing else changes. The admin live-order toast (AD-6, Phase 7) must import the REAL package through the
// "realtime-real" alias and open its own socket from a lazy admin chunk, never from the entry (ADR UX-D021).
export class RealtimeClient {
  constructor(..._args: unknown[]) { /* no socket is ever opened */ }
  setAuth(..._args: unknown[]) { /* token updates are ignored: no channels exist */ }
  channel(..._args: unknown[]): never { throw new Error("Realtime is not available in the storefront bundle. Use the lazy admin Realtime module (alias realtime-real)."); }
  getChannels() { return []; }
  removeChannel(..._args: unknown[]) { return Promise.resolve("ok" as const); }
  removeAllChannels() { return Promise.resolve([] as const); }
}
