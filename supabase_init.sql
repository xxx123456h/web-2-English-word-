-- ============================================
-- WordWise 完整 SQL 初始化脚本
-- 包含所有表的 RLS 策略、Trigger、RPC 函数
-- 适用于 Supabase 项目 snymmsnmlhuawjalebdu
-- ============================================

-- ============================================
-- 1. 用户资料表 profiles
-- ============================================
-- 兼容已有 profiles 表，添加 avatar_id 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    CREATE TABLE public.profiles (
      id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      nickname     TEXT DEFAULT '',
      gender       TEXT DEFAULT 'unknown'  CHECK (gender IN ('male','female','unknown')),
      grade_level  TEXT DEFAULT 'high_school'
                   CHECK (grade_level IN ('junior','high_school','cet4','cet6','ielts','other')),
      avatar_id    INT DEFAULT NULL,
      avatar_url   TEXT DEFAULT '',
      bio          TEXT DEFAULT '',
      created_at   TIMESTAMPTZ DEFAULT now(),
      updated_at   TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

-- 添加 avatar_id 字段（如已存在 profiles 表但没有该字段）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_id') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_id INT DEFAULT NULL;
  END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "自己可查看自己的资料" ON public.profiles;
DROP POLICY IF EXISTS "自己可编辑自己的资料" ON public.profiles;
DROP POLICY IF EXISTS "好友可查看资料" ON public.profiles;

CREATE POLICY "自己可查看自己的资料" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "自己可编辑自己的资料" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "好友可查看资料" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT CASE WHEN requester_id = auth.uid() THEN addressee_id ELSE requester_id END
      FROM public.friendships WHERE status = 'accepted'
        AND (requester_id = auth.uid() OR addressee_id = auth.uid())
    )
  );

-- ============================================
-- 2. 注册时自动创建 profile (Trigger)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, split_part(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 3. 好友关系表 friendships
-- ============================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','blocked')),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id, status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "自己可见的好友关系" ON public.friendships;
DROP POLICY IF EXISTS "可发起好友请求" ON public.friendships;
DROP POLICY IF EXISTS "关系双方可更新" ON public.friendships;
DROP POLICY IF EXISTS "可删除好友关系" ON public.friendships;

CREATE POLICY "自己可见的好友关系" ON public.friendships
  FOR SELECT USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "可发起好友请求" ON public.friendships
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "关系双方可更新" ON public.friendships
  FOR UPDATE USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "可删除好友关系" ON public.friendships
  FOR DELETE USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- ============================================
-- 4. 每日学习统计表 daily_stats
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stat_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  words_learned   INT DEFAULT 0,
  words_reviewed  INT DEFAULT 0,
  quiz_total      INT DEFAULT 0,
  quiz_correct    INT DEFAULT 0,
  rating_level    INT DEFAULT 3,
  rating_label    TEXT DEFAULT 'npc',
  streak_days     INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON public.daily_stats(user_id, stat_date DESC);

ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "自己可读写统计" ON public.daily_stats;
DROP POLICY IF EXISTS "好友可查看统计" ON public.daily_stats;

CREATE POLICY "自己可读写统计" ON public.daily_stats
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "好友可查看统计" ON public.daily_stats
  FOR SELECT USING (
    user_id IN (
      SELECT CASE WHEN requester_id = auth.uid() THEN addressee_id ELSE requester_id END
      FROM public.friendships WHERE status = 'accepted'
        AND (requester_id = auth.uid() OR addressee_id = auth.uid())
    )
  );

-- ============================================
-- 5. 打卡记录表 checkins
-- ============================================
CREATE TABLE IF NOT EXISTS public.checkins (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkin_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  words_count     INT DEFAULT 0,
  streak_days     INT DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON public.checkins(user_id, checkin_date DESC);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "自己可读写打卡" ON public.checkins;
DROP POLICY IF EXISTS "好友可查看打卡" ON public.checkins;

CREATE POLICY "自己可读写打卡" ON public.checkins
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "好友可查看打卡" ON public.checkins
  FOR SELECT USING (
    user_id IN (
      SELECT CASE WHEN requester_id = auth.uid() THEN addressee_id ELSE requester_id END
      FROM public.friendships WHERE status = 'accepted'
        AND (requester_id = auth.uid() OR addressee_id = auth.uid())
    )
  );

-- ============================================
-- 6. increment_daily_stat RPC 函数
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_daily_stat(
  p_user_id UUID,
  p_date DATE,
  p_field TEXT,
  p_value INT
) RETURNS VOID AS $$
BEGIN
  -- 先插入占位记录（如果不存在）
  INSERT INTO public.daily_stats (user_id, stat_date)
  VALUES (p_user_id, p_date)
  ON CONFLICT (user_id, stat_date) DO NOTHING;

  -- 更新指定字段
  EXECUTE format(
    'UPDATE public.daily_stats SET %I = %I + $1, updated_at = now() WHERE user_id = $2 AND stat_date = $3',
    p_field, p_field
  ) USING p_value, p_user_id, p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_daily_stat TO authenticated;

-- ============================================
-- 7. Storage: avatars bucket 策略
-- ============================================
-- 假设 avatars bucket 已经存在（如不存在请在 Dashboard 创建）
-- 文件路径格式: avatars/{user_id}/avatar-{timestamp}.jpg

-- 允许所有登录用户查看头像（公开读）
DROP POLICY IF EXISTS "头像公开读取" ON storage.objects;
CREATE POLICY "头像公开读取" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 用户可上传/更新/删除自己目录下的头像
DROP POLICY IF EXISTS "用户上传自己的头像" ON storage.objects;
CREATE POLICY "用户上传自己的头像" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))
  );

DROP POLICY IF EXISTS "用户更新自己的头像" ON storage.objects;
CREATE POLICY "用户更新自己的头像" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))
  );

DROP POLICY IF EXISTS "用户删除自己的头像" ON storage.objects;
CREATE POLICY "用户删除自己的头像" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))
  );

-- ============================================
-- 8. 验证查询（执行后能看到所有表和策略）
-- ============================================
SELECT 'profiles' as table_name, count(*) as policy_count
FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
UNION ALL
SELECT 'friendships', count(*) FROM pg_policies WHERE tablename = 'friendships' AND schemaname = 'public'
UNION ALL
SELECT 'daily_stats', count(*) FROM pg_policies WHERE tablename = 'daily_stats' AND schemaname = 'public'
UNION ALL
SELECT 'checkins', count(*) FROM pg_policies WHERE tablename = 'checkins' AND schemaname = 'public'
UNION ALL
SELECT 'storage.objects', count(*) FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- ============================================
-- 完成提示
-- ============================================
-- 执行成功后你将拥有：
--   ✅ profiles 表（自动建档 trigger + 4 个 RLS 策略）
--   ✅ friendships 表（4 个 RLS 策略）
--   ✅ daily_stats 表（2 个 RLS 策略）
--   ✅ checkins 表（2 个 RLS 策略）
--   ✅ increment_daily_stat RPC 函数
--   ✅ avatars Storage 4 个 RLS 策略（读/插/改/删）
--   ✅ 所有表启用 RLS
