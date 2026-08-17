import { supabase } from './supabase';
import type { VoiceIntent } from './searchEngine';

export type { VoiceIntent };

const TIMEOUT_MS = 4000;

function timeout<T>(ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fallback), ms));
}

export async function parseVoiceIntent(transcript: string): Promise<VoiceIntent | null> {
  try {
    const result = await Promise.race([
      // Displayed as "voice-search" in the dashboard, but the real function
      // slug (and invoke name) is still 'clever-action' — Supabase's rename
      // only relabels the list entry, it doesn't change the underlying route.
      supabase.functions.invoke('clever-action', { body: { transcript } }),
      timeout(TIMEOUT_MS, null),
    ]);

    if (!result || result.error || !result.data?.intent) return null;
    return result.data.intent as VoiceIntent;
  } catch {
    return null;
  }
}
