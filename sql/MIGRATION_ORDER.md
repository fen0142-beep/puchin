# SQL 遷移執行順序

> 若要在新環境重建資料庫，依照以下順序執行。
> 每個檔案都設計為可重複執行（`CREATE TABLE IF NOT EXISTS`、`CREATE INDEX IF NOT EXISTS`）。
> 檔名前綴已依本文件的階段／順序編號（`{階段}_{階段內步驟}_`），可直接依檔名字典序排序執行。

## 第一階段：基礎架構

| 順序 | 檔案 | 說明 |
|------|------|------|
| 1 | `1_1_schema.sql` | 主要資料表（students、events、registrations 等） |
| 2 | `1_2_admin_setup.sql` | 管理員帳號與 anon 基本 GRANT |
| 3 | `1_3_role_setup.sql` | 角色定義（admin / volunteer） |
| 4 | `1_4_volunteer_access_setup.sql` | 義工存取權限 |
| 5 | `1_5_monk_setup.sql` | 法師資料表 |
| 6 | `1_6_relationship_setup.sql` | 學員關係連結 |

## 第二階段：報名功能

| 順序 | 檔案 | 說明 |
|------|------|------|
| 7 | `2_1_registration_tracking_setup.sql` | 報名追蹤欄位 |
| 8 | `2_2_cancel_registration_setup.sql` | 取消報名功能 |
| 9 | `2_3_guest_registration_setup.sql` | 訪客報名 |
| 10 | `2_4_batch_e_setup.sql` | 批次 E 設定 |

## 第三階段：車輛系統

| 順序 | 檔案 | 說明 |
|------|------|------|
| 11 | `3_1_car_arrangement_setup.sql` | 車輛安排主表 |
| 12 | `3_2_small_car_leader_setup.sql` | 小車領隊 |
| 13 | `3_3_add_direction_to_car_assignments.sql` | 上下山方向欄位 |
| 14 | `3_4_fix_unique_for_direction.sql` | 方向唯一值修正 |
| 15 | `3_5_add_car_member_checkin.sql` | 車輛報到功能 |
| 16 | `3_6_add_pre_depart.sql` | 提早出發設定 |
| 17 | `3_7_add_late_return.sql` | 晚回設定 |

## 第四階段：欄位擴充

| 順序 | 檔案 | 說明 |
|------|------|------|
| 18 | `4_01_add_field_types.sql` | 自訂欄位類型 |
| 19 | `4_02_add_boolean_field_type.sql` | 布林欄位類型 |
| 20 | `4_03_add_date_field_type.sql` | 日期欄位類型 |
| 21 | `4_04_add_event_type.sql` | 活動類型欄位 |
| 22 | `4_05_add_host_student_id.sql` | 主辦人學員 ID |
| 23 | `4_06_add_placeholder_column.sql` | 佔位欄位 |
| 24 | `4_07_add_activities_fields.sql` | 活動頁欄位 |
| 25 | `4_08_add_related_links.sql` | 相關連結 |
| 26 | `4_09_add_cover_image_position.sql` | 封面圖位置 |
| 27 | `4_10_add_kiosk_open.sql` | Kiosk 開放設定 |
| 28 | `4_11_add_volunteer_open.sql` | 義工報名開放 |
| 29 | `4_12_add_walkin_mode.sql` | 現場報名模式 |
| 30 | `4_13_add_registration_source.sql` | 報名來源 |

## 第五階段：模板與重複活動

| 順序 | 檔案 | 說明 |
|------|------|------|
| 31 | `5_01_add_templates_table.sql` | 活動模板表 |
| 32 | `5_02_add_phase2_b.sql` | Phase 2b 欄位補充 |
| 33 | `5_03_add_phase3.sql` | Phase 3（功德主表） |
| 34 | `5_04_phase5_batch1_sessions.sql` | Phase 5 場次 |
| 35 | `5_05_phase5_session_fields.sql` | Phase 5 場次欄位 |
| 36 | `5_06_phase5_batch1_fix_policies.sql` | Phase 5 RLS 修正 |
| 37 | `5_07_add_is_recurring.sql` | 重複活動標記 |
| 38 | `5_08_create_recurring_templates.sql` | 重複活動模板 |
| 39 | `5_09_template_session_fields_migration.sql` | 模板場次欄位遷移 |
| 40 | `5_10_registration_session_checkins.sql` | 場次報到 |

## 第六階段：資料修正與維護

| 順序 | 檔案 | 說明 |
|------|------|------|
| 41 | `6_1_class_normalization.sql` | 班別名稱正規化 |
| 42 | `6_2_update_fields_and_transport.sql` | 欄位與交通更新 |
| 43 | `6_3_batch_update_transport.sql` | 批次交通資料更新 |
| 44 | `6_4_update_default_templates.sql` | 預設模板更新 |
| 45 | `6_5_dashboard_role_migration.sql` | Dashboard 角色遷移 |
| 46 | `6_6_show_transport_to_public_migration.sql` | 交通資訊公開遷移 |
| 47 | `6_7_recurring_batch2.sql` | 重複活動批次 2 |
| 48 | `6_8_recurring_batch3.sql` | 重複活動批次 3 |
| 49 | `6_9_events_lock.sql` | 活動鎖定機制 |

## 定時任務（Cron）

| 檔案 | 說明 |
|------|------|
| `cron_weekly_gonxiu_cron.sql` | 每週功修自動建立 |
| `cron_clean_guest_phone_cron.sql` | 定期清理訪客電話 |

## 安全修復

| 順序 | 檔案 | 說明 |
|------|------|------|
| 最新 | `security_fix_car_token_security.sql` | 車次 Token 安全修復（RLS + RPC） |

## ⚠️ 注意事項

- 2026-06-05 安全修正：`registrations` 移除 anon UPDATE/DELETE，`event_donors` 完全封鎖 anon，`students` 改用 RPC 函數。這些修正已直接套用於 Supabase，**不在以上 SQL 檔案中**，換環境時需另外執行 `fix_rls_clean.sql`（位於上層 `puyi-signup/` 目錄）。
- 以下檔案存在於 `sql/` 目錄中，但未被本文件記載執行順序（檔名維持原樣，未重新命名）：`debug_identity_values.sql`、`fix_cancel_registration_rls.sql`、`fix_friend_registration_rls.sql`、`fix_get_student_by_qr_active.sql`、`fix_recurring_fields_volunteers.sql`、`fix_rls_registrations_anon.sql`、`fix_update_checkin_rls.sql`、`fix_volunteer_event_access.sql`。其中多個檔案定義了前端實際呼叫的 RPC function（如 `get_student_by_qr`、`kiosk_cancel_registration`），並非可忽略的檔案，建置新環境時仍需另外確認並執行。
