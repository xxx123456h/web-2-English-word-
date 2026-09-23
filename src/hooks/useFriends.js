// src/hooks/useFriends.js
// 好友系统数据管理

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('friendships')
        .select(`
          id, created_at,
          requester:profiles!friendships_requester_id_fkey(id, nickname, avatar_url, grade_level),
          addressee:profiles!friendships_addressee_id_fkey(id, nickname, avatar_url, grade_level)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const friendList = (data || []).map(f =>
        f.requester.id === user.id ? f.addressee : f.requester
      );
      setFriends(friendList);
    } catch (err) {
      console.warn('friendships 查询失败（可能表不存在）:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchPending = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('friendships')
        .select('*, requester:profiles!friendships_requester_id_fkey(id, nickname, avatar_url)')
        .eq('addressee_id', user.id)
        .eq('status', 'pending');
      setPendingRequests(data || []);
    } catch (err) {
      console.warn('pending requests 查询失败:', err.message);
    }
  }, [user]);

  const fetchSent = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('friendships')
        .select('*, addressee:profiles!friendships_addressee_id_fkey(id, nickname, avatar_url)')
        .eq('requester_id', user.id)
        .eq('status', 'pending');
      setSentRequests(data || []);
    } catch (err) {
      console.warn('sent requests 查询失败:', err.message);
    }
  }, [user]);

  useEffect(() => {
    fetchFriends();
    fetchPending();
    fetchSent();
  }, [fetchFriends, fetchPending, fetchSent]);

  const searchUser = async (keyword) => {
    if (!user) return [];
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url, grade_level')
        .ilike('nickname', `%${keyword}%`)
        .neq('id', user.id)
        .limit(10);
      return data || [];
    } catch (err) {
      console.warn('searchUser 失败:', err.message);
      return [];
    }
  };

  const sendRequest = async (targetUserId) => {
    if (!user) return { error: '未登录' };
    return supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: targetUserId,
      status: 'pending',
    });
  };

  const respondRequest = async (friendshipId, accept) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', friendshipId);
      if (!error) { fetchFriends(); fetchPending(); }
    } catch (err) {
      console.warn('respondRequest 失败:', err.message);
    }
  };

  const removeFriend = async (friendshipId) => {
    if (!user) return;
    try {
      await supabase.from('friendships').delete().eq('id', friendshipId);
      fetchFriends();
    } catch (err) {
      console.warn('removeFriend 失败:', err.message);
    }
  };

  return {
    friends, pendingRequests, sentRequests, loading,
    searchUser, sendRequest, respondRequest, removeFriend,
    refetch: () => { fetchFriends(); fetchPending(); fetchSent(); }
  };
}
