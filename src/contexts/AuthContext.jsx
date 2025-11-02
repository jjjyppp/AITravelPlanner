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
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const register = async (phone, username, email, password) => {
    try {
      // 检查手机号是否已注册
      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .single();
      
      if (!existingUserError) {
        return { success: false, error: '该手机号已被注册' };
      }
      
      // 使用新的auth服务进行注册，添加用户信息作为额外数据
      const userData = {
        username,
        phone
      };
      
      const { data, error } = await auth.signUp(email, password, userData);
      
      if (error) {
        throw error;
      }
      
      // 如果注册成功，创建用户个人资料
        if (data.user) {
          console.log(data.user.id);
          
          // 直接在users表中创建用户记录
          const userData = {
            // 不指定id字段，让数据库自动生成bigint类型的id
            // 添加user_id字段存储Supabase认证系统生成的用户UUID
            // 这样行级安全策略可以使用auth.uid() = user_id来验证权限
            user_id: data.user.id, // Supabase认证的用户UUID，用于RLS策略验证
            phone: phone,
            username: username,
            email: email,
            created_at: new Date().toISOString(),
            // 可选：设置初始状态
            status: 'active'
          };
          
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert(userData);
            
          if (insertError) {
            console.error('Error creating user in users table:', insertError);
            // 即使插入失败也继续，因为认证已经成功
          } else {
            console.log('User profile created successfully in users table:', insertData);
          }
      }
      
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
