import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const isPrivilegedKey = Boolean(
  supabaseAnonKey &&
  (supabaseAnonKey.startsWith('sb_secret_') || supabaseAnonKey.startsWith('service_role'))
);

if (isPrivilegedKey && typeof window !== 'undefined') {
  console.error(
    '[Segurança] ERRO CRÍTICO: Chave secreta/service_role detectada no navegador! O cliente Supabase foi desativado por segurança.'
  );
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !isPrivilegedKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

// O cliente do navegador usa @supabase/ssr com detectSessionInUrl ativado para
// capturar imediatamente tokens PKCE (?code=) ou fragmentos de hash (#access_token=)
// no Safari/iPhone e em qualquer navegador mobile/desktop.
export const supabase = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: true,
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
      },
      cookieOptions: {
        maxAge: 60 * 60 * 24 * 30, // 30 dias (tempo balanceado e seguro)
        path: '/',
        sameSite: 'lax',
        secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : process.env.NODE_ENV === 'production',
      },
    })
  : null;

