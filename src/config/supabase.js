// Supabase 配置文件（统一从环境变量读取）
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
export const supabaseConfig = {
  url: env.VITE_SUPABASE_URL || '',
  anonKey: env.VITE_SUPABASE_ANON_KEY || ''
};
