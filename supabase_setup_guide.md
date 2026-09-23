# WordWise Supabase RLS 配置指南

## 一、概述

本文档说明如何为 WordWise 项目配置 Supabase 数据库安全策略（Row Level Security, RLS），包括：
- 4 个新表的创建（profiles / friendships / daily_stats / checkins）
- 全部表的 RLS 策略
- 自动创建 profile 的 Trigger
- 每日统计自增 RPC 函数
- Storage avatars bucket 策略

## 二、执行 SQL 脚本

### 1. 进入 SQL Editor
打开浏览器，访问 [Supabase Dashboard](https://app.supabase.com) → 选择项目 `snymmsnmlhuawjalebdu` → 左侧菜单点击 **SQL Editor** → **New query**

### 2. 复制并执行 SQL
1. 打开项目根目录下的 `supabase_init.sql` 文件
2. 复制全部内容（约 200 行）
3. 粘贴到 Supabase SQL Editor 中
4. 点击右下角 **Run** 按钮（或 Ctrl/Cmd+Enter）

### 3. 验证执行成功
执行后，最下方应显示类似结果：
```
table_name        | policy_count
------------------|-------------
profiles          | 3
friendships       | 4
daily_stats       | 2
checkins          | 2
storage.objects   | 4
```

如果某行显示 0，说明策略没创建成功，请检查 SQL 报错信息。

---

## 三、手动创建 Storage Bucket（如未自动创建）

`avatars` bucket 应已存在，**如不存在请手动创建**：

1. 左侧菜单 → **Storage** → **New bucket**
2. 名称：`avatars`
3. 勾选 **Public bucket**（公开读）
4. 点击 **Create bucket**

---

## 四、SQL 详解

### 4.1 RLS 策略表

| 表 | 策略数 | 说明 |
|------|------|------|
| `profiles` | 3 | 1. 自己查/改自己 2. 好友查 |
| `friendships` | 4 | 读 / 插入 / 更新 / 删除（关系双方均可） |
| `daily_stats` | 2 | 1. 自己读写 2. 好友查 |
| `checkins` | 2 | 1. 自己读写 2. 好友查 |
| `storage.objects` | 4 | 头像读/插/改/删（用户只能操作自己目录） |

### 4.2 Profiles 表

```sql
-- 自己查自己
SELECT * FROM profiles WHERE id = auth.uid();

-- 好友互相可查
SELECT * FROM profiles WHERE id IN (
  SELECT friend_id FROM friendships WHERE status = 'accepted'
);

-- 自己更新自己
UPDATE profiles SET nickname = '新昵称' WHERE id = auth.uid();
```

### 4.3 Friendships 表

```sql
-- 发起好友请求
INSERT INTO friendships (requester_id, addressee_id, status)
VALUES (auth.uid(), 'target-uuid', 'pending');

-- 接受好友请求
UPDATE friendships SET status = 'accepted'
WHERE id = 'request-id' AND addressee_id = auth.uid();
```

### 4.4 daily_stats + checkins + RPC

项目通过 `useDailyRating.recordLearn()` / `useCheckin.doCheckin()` 调用：

```sql
-- 调用示例
SELECT increment_daily_stat(
  'user-uuid',
  CURRENT_DATE,
  'words_learned',
  5
);
```

效果：当日 `words_learned += 5`，多次调用累加。

### 4.5 Storage 头像路径规范

```
avatars/
  └── {user_id}/
      └── avatar-{timestamp}.jpg
```

例如：
```
avatars/863e0dad-4c28-4d60-b556-82ed43184173/avatar-1717392000000.jpg
```

RLS 策略保证：用户只能上传/修改/删除自己 `user_id` 目录下的文件。

---

## 五、常见问题排查

### Q1: 上传头像时报错 `Bucket not found`
- 检查 `avatars` bucket 是否创建
- 确认 bucket 名严格小写为 `avatars`（与代码一致）

### Q2: 上传时 RLS 报错 `new row violates row-level security policy`
- 在 Supabase Dashboard → SQL Editor 执行 SQL 脚本中的第 7 节
- 特别留意 `auth.uid()::text = (storage.foldername(name))` 策略

### Q3: 个人资料页加载不到头像
- 检查 `useAuth` 是否正确暴露 `profile`
- 浏览器 DevTools Network 标签查看 `profiles` 表查询是否成功

### Q4: 打卡 / 评级功能报错
- 执行第 6 节的 `increment_daily_stat` 函数
- 执行第 5 节的 `checkins` 表创建
- 检查 `daily_stats` 表是否创建

### Q5: 新用户注册后没有自动创建 profile
- 执行第 2 节的 `handle_new_user()` 函数 + `on_auth_user_created` Trigger
- 这两个是配套的，必须同时执行

---

## 六、查询当前所有策略

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;
```

预期看到 15+ 条策略。

## 七、查询当前所有 Trigger

```sql
SELECT trigger_name, event_manipulation, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth';
```

应看到 `on_auth_user_created` 在 `auth.users` 表上。

## 八、查询 RPC 函数

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public';
```

应看到 `increment_daily_stat` 和 `handle_new_user`。

---

## 九、SQL 完整执行检查清单

- [ ] 1. profiles 表已存在
- [ ] 2. profiles 表有 avatar_id 字段
- [ ] 3. profiles RLS 策略 3 条
- [ ] 4. handle_new_user 函数存在
- [ ] 5. on_auth_user_created trigger 在 auth.users 上
- [ ] 6. friendships 表已存在
- [ ] 7. friendships RLS 策略 4 条
- [ ] 8. daily_stats 表已存在
- [ ] 9. daily_stats RLS 策略 2 条
- [ ] 10. checkins 表已存在
- [ ] 11. checkins RLS 策略 2 条
- [ ] 12. increment_daily_stat 函数存在
- [ ] 13. avatars bucket 已创建且为 public
- [ ] 14. storage.objects 上 avatars 4 条 RLS 策略

全部 ✅ 后即可在 WordWise 中正常使用所有社交功能。
