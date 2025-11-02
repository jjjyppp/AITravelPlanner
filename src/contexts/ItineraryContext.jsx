import React, { createContext, useContext } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';

const ItineraryContext = createContext({});

export const useItinerary = () => {
  const context = useContext(ItineraryContext);
  if (!context) {
    throw new Error('useItinerary must be used within an ItineraryProvider');
  }
  return context;
};

export const ItineraryProvider = ({ children }) => {
  const { user } = useAuth();

  // 保存旅行计划
  const saveItinerary = async (itineraryData) => {
    if (!user) {
      throw new Error('用户未登录');
    }

    try {
      // 兼容调用方传入的 camelCase 或 snake_case 字段
      const startDate = itineraryData.startDate ?? itineraryData.start_date ?? null;
      const endDate = itineraryData.endDate ?? itineraryData.end_date ?? null;
      const personCount = itineraryData.personCount ?? itineraryData.person_count ?? 1;
      const interests = itineraryData.interests ?? itineraryData.interests_text ?? [];

      const { data, error } = await supabase
        .from('itineraries')
        .insert([
          {
            user_id: user.id,
            title: itineraryData.title || `旅行计划 - ${new Date().toLocaleDateString()}`,
            destination: itineraryData.destination,
            start_date: startDate,
            end_date: endDate,
            person_count: personCount,
            interests: Array.isArray(interests) ? JSON.stringify(interests) : String(interests || ''),
            budget: itineraryData.budget ?? null,
            content: itineraryData.content,
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      return { success: true, data: data[0] };
    } catch (error) {
      console.error('保存行程失败:', error);
      return { success: false, error: error.message };
    }
  };

  // 获取用户的所有旅行计划
  const getUserItineraries = async () => {
    if (!user) {
      return { success: false, error: '用户未登录', data: [] };
    }

    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // 解析JSON字段
      const parsedData = data.map(item => ({
        ...item,
        interests: item.interests ? JSON.parse(item.interests) : [],
      }));

      return { success: true, data: parsedData };
    } catch (error) {
      console.error('获取行程列表失败:', error);
      return { success: false, error: error.message, data: [] };
    }
  };

  // 获取单个旅行计划
  const getItineraryById = async (id) => {
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      // 解析JSON字段
      const parsedData = {
        ...data,
        interests: data.interests ? JSON.parse(data.interests) : [],
      };

      return { success: true, data: parsedData };
    } catch (error) {
      console.error('获取行程详情失败:', error);
      return { success: false, error: error.message };
    }
  };

  // 更新旅行计划
  const updateItinerary = async (id, updates) => {
    if (!user) {
      throw new Error('用户未登录');
    }

    try {
      // 确保更新字段是安全的
      const updateData = {};
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.interests !== undefined) updateData.interests = JSON.stringify(updates.interests);

      const { data, error } = await supabase
        .from('itineraries')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select();

      if (error) {
        throw error;
      }

      return { success: true, data: data[0] };
    } catch (error) {
      console.error('更新行程失败:', error);
      return { success: false, error: error.message };
    }
  };

  // 删除旅行计划
  const deleteItinerary = async (id) => {
    if (!user) {
      throw new Error('用户未登录');
    }

    try {
      const { error } = await supabase
        .from('itineraries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('删除行程失败:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    saveItinerary,
    getUserItineraries,
    getItineraryById,
    updateItinerary,
    deleteItinerary,
  };

  return <ItineraryContext.Provider value={value}>{children}</ItineraryContext.Provider>;
};
