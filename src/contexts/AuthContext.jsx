import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase, auth } from '../supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查用户是否已登录
    const checkUser = async () => {
      try {
        const { user } = await auth.getCurrentUser();
        setUser(user);
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // 监听认证状态变化（适配 supabase-js v2 返回结构）
    const { data } = auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    }) || {};

    return () => {
      try {
        data?.subscription?.unsubscribe?.();
      } catch (e) {
        // 忽略清理时的异常，避免影响页面加载
        console.warn('Auth subscription cleanup failed:', e);
      }
    };
  }, []);

  const login = async (email, password) => {
    try {
      // 使用新的auth服务进行登录
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        throw error;
      }
      
      setUser(data.user);
      // 登录成功后，合并注册阶段暂存的资料并写入 users（此时已有会话，RLS 可通过）
      try {
        let extra = null;
        try { extra = JSON.parse(localStorage.getItem('pendingProfile') || 'null'); } catch {}
        // 仅写入最小必要字段，避免与后端列不一致导致 400
        const profileRow = {
          id: data.user.id,
          email: data.user.email,
          ...(extra?.phone ? { phone: extra.phone } : {}),
          ...(extra?.username ? { username: extra.username } : {}),
        };
        const { error: profileError } = await supabase.from('users').upsert(profileRow);
        if (profileError) {
          console.warn('登录后写入 users 表失败（可能为列不存在或 RLS 限制）:', profileError.message || profileError);
        }
        if (extra) localStorage.removeItem('pendingProfile');
      } catch (e) {
        console.warn('登录后写入 users 表失败（可能为 RLS/权限问题）:', e)
      }
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const register = async (phone, username, email, password) => {
    try {
      // 采用方案A：前端不直接写 users，交由数据库触发器自动建档
      const userData = { username, phone };
      const { data, error } = await auth.signUp(email, password, userData);
      if (error) { throw error; }
      // 暂存扩展资料，等待首次登录后再更新到 public.users
      try { localStorage.setItem('pendingProfile', JSON.stringify({ phone, username })); } catch {}
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      // 使用新的auth服务进行登出
      const { error } = await auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
