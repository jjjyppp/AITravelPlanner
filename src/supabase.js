import { createClient } from '@supabase/supabase-js'
import { supabaseConfig } from './config/supabase'

// 创建Supabase客户端
export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey)

// 认证相关的方法
export const auth = {
  // 用户注册
  signUp: async (email, password, userData = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData, // 额外的用户数据，如姓名等
        emailRedirectTo: window.location.origin // 禁用邮件验证以避免速率限制
      }
    })
    return { data, error }
  },

  // 用户登录
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // 用户登出
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // 获取当前用户
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // 获取当前会话
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // 监听认证状态变化
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// 旅行计划相关的方法
export const travelPlans = {
  // 创建旅行计划
  create: async (planData) => {
    const { data, error } = await supabase
      .from('travel_plans')
      .insert([planData])
      .select()
    return { data, error }
  },

  // 获取用户的所有旅行计划
  getByUser: async (userId) => {
    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // 获取单个旅行计划详情
  getById: async (planId) => {
    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('id', planId)
      .single()
    return { data, error }
  },

  // 更新旅行计划
  update: async (planId, updates) => {
    const { data, error } = await supabase
      .from('travel_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .select()
    return { data, error }
  },

  // 删除旅行计划
  delete: async (planId) => {
    const { data, error } = await supabase
      .from('travel_plans')
      .delete()
      .eq('id', planId)
    return { data, error }
  },

  // 获取AI生成的旅行计划
  getAIGenerated: async (userId) => {
    const { data, error } = await supabase
      .from('travel_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('ai_generated', true)
      .order('created_at', { ascending: false })
    return { data, error }
  }
}

// 用户偏好设置相关的方法
export const userPreferences = {
  // 创建偏好设置
  create: async (preferenceData) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .insert([preferenceData])
      .select()
    return { data, error }
  },

  // 获取用户的所有偏好设置
  getByUser: async (userId) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
    return { data, error }
  }
}