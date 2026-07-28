-- ============================================================
-- reset_test_project.sql — 測試專案專用清除腳本
--
-- 用途：清掉 sql/all.sql 會建立的所有物件（22 張基礎表 +
--       recurring_templates + 相關 function/trigger），
--       讓測試用 Supabase 專案可以重新乾淨執行一次 all.sql。
--
-- ⚠️ 警告：
--   1. 僅限測試／可重建專案使用，執行後所有資料（学员、報名、
--      排車等）全部清空且無法復原。
--   2. 這份清單只涵蓋 all.sql 實際建立的物件。刻意不包含
--      kiosk_submit_registration —— 這個前台報名用的 RPC
--      function 在整個 sql/ 目錄中找不到任何定義檔（推測是
--      直接在 Supabase 後台建立的），本腳本不會、也不能重建它。
--      若這個 function 在你的專案中還存在，執行本腳本 + 重跑
--      all.sql 之後它會繼續運作；但如果你的專案本來就沒有這個
--      function，重跑 all.sql 之後前台報名功能仍然會是壞的。
-- ============================================================


-- ────────────────────────────────────────────
-- 1. 刪除資料表（CASCADE 會一併清掉 FK、index、
--    trigger、以及掛在這些表上的所有 RLS policy）
-- ────────────────────────────────────────────

DROP TABLE IF EXISTS
  students,
  student_classes,
  events,
  event_fields,
  event_templates,
  event_sessions,
  event_session_fields,
  registrations,
  registration_changes,
  registration_session_checkins,
  audit_log,
  event_donors,
  car_assignments,
  car_members,
  car_leaders,
  head_leader,
  temple_monks,
  car_monks,
  relationship_groups,
  relationship_members,
  volunteer_profiles,
  volunteer_event_access,
  recurring_templates
CASCADE;


-- ────────────────────────────────────────────
-- 2. 刪除 all.sql 建立的 function
--    （trigger 已隨資料表一併被 CASCADE 刪除，
--     這裡只需要清 function 本體）
-- ────────────────────────────────────────────

DROP FUNCTION IF EXISTS touch_registrations_updated_at() CASCADE;
DROP FUNCTION IF EXISTS touch_event_donors_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_registrations_updated_at() CASCADE;
DROP FUNCTION IF EXISTS create_recurring_events_in_range(UUID, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS kiosk_cancel_registration(UUID) CASCADE;
DROP FUNCTION IF EXISTS kiosk_submit_registration(UUID, TEXT, JSONB, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS kiosk_submit_friend_registration(UUID, TEXT, JSONB, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS get_student_by_qr(TEXT) CASCADE;
DROP FUNCTION IF EXISTS kiosk_get_registrations_for_student(TEXT, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS kiosk_update_registration(UUID, JSONB, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS kiosk_checkin_other_transport(UUID, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS get_car_by_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_leader_cars(TEXT, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS checkin_car_member(TEXT, UUID, UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS checkin_all_car(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS checkin_car_monk(TEXT, UUID, BOOLEAN) CASCADE;

-- 完成後用以下查詢確認資料表都已清空（應該只剩 Supabase 內建的 auth/storage 等 schema，
-- public schema 下應該完全沒有資料表）：
--
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
