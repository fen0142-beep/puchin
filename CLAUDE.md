# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概覽

普宜精舍報名系統（`puyi-signup`）— 一套供佛教精舍活動使用的 QR 學員證報到／報名系統。React 單頁應用程式**直接呼叫 Supabase**（Postgres + Auth + RPC），沒有自己的後端伺服器。部署於 Vercel。設計上可供其他分院 fork 後重新部署（詳見 `SETUP.md`，中文文件）。

## 常用指令

```bash
npm run dev       # 啟動 Vite 開發伺服器
npm run build     # 正式環境打包
npm run preview   # 本機預覽打包結果
```

`package.json` 中沒有設定測試、lint 或型別檢查指令。不要假設有 `npm test` 或 `npm run lint` 可用。

環境設定：將 `.env.example` 複製為 `.env.local`，填入 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`，以及選填的 `VITE_TEMPLE_NAME`。

## 架構

### 沒有後端 — Supabase 就是整個伺服器層

所有資料操作都集中在 `src/lib/supabase.js`（約 2500 行，一個依功能分區、以中文區塊註解分隔的大型模組，包含許多 export 出來的 async function）— 建議用區塊搜尋而非從頭讀到尾。所有需要被信任的業務邏輯（身份驗證、跨資料表一致性、任何 anon 使用者會觸發的動作）都下推到 **Postgres RPC function**（`supabase.rpc(...)`），而非直接呼叫 `.from(...).insert/update/delete()`，原因是：

- anon key 是公開寫在前端打包檔裡的 — 整個安全邊界完全依賴 **Supabase Row Level Security（RLS）政策**加上 `SECURITY DEFINER` RPC function。
- anon 使用者對 `registrations` 與 `students` 沒有直接的 UPDATE/DELETE 權限 — 公開頁面（kiosk 報名／編輯／取消、車輛報到）上的所有前端寫入都是走 RPC，例如 `kiosk_submit_registration`、`kiosk_update_registration`、`kiosk_cancel_registration`、`kiosk_checkin_other_transport`、`checkin_all_car`、`checkin_car_member`。
- 新增任何面向公開頁面（非後台）的寫入功能時，請遵循此模式：寫一個 `SECURITY DEFINER` SQL function，授權給 `anon`，再透過 `.rpc()` 呼叫 — 不要直接把 table 的 UPDATE/DELETE 權限開給 anon。

### SQL 遷移是手動編號的檔案，不是用遷移工具管理

所有 schema 變更都以獨立的 `.sql` 檔存放於 `sql/` 目錄下，檔名前綴為 `{階段}_{階段內步驟}_`（例如 `1_1_schema.sql`、`4_01_add_field_types.sql`），依 `sql/MIGRATION_ORDER.md` 記載的階段編號排序即為執行順序。命名慣例：
- `*_setup.sql` — 功能初始設定
- `add_*.sql` — 新增欄位／資料表等擴充變更
- `fix_*.sql` — 修正性補丁（常見於 RLS 修正）
- `1_1_schema.sql` — 基礎資料表，最先執行
- `cron_*.sql` — 定時任務（不屬於任何階段）
- `security_*.sql` — 安全修復（不屬於任何階段）

`sql/` 目錄下還有 8 個檔案未被 `MIGRATION_ORDER.md` 記載執行順序、因此維持原檔名未編號：`debug_identity_values.sql`、`fix_cancel_registration_rls.sql`、`fix_friend_registration_rls.sql`、`fix_get_student_by_qr_active.sql`、`fix_recurring_fields_volunteers.sql`、`fix_rls_registrations_anon.sql`、`fix_update_checkin_rls.sql`、`fix_volunteer_event_access.sql`。其中多個定義了前端實際呼叫的 RPC function（見上方 RPC 清單），建置新環境時仍必須額外執行，不能因為沒被編號就略過。

修改 schema 時，請新增一個編號後的 `.sql` 檔，並在 `sql/MIGRATION_ORDER.md` 補上一筆條目 — 不要直接修改舊的遷移檔案，因為那些檔案記錄了實際曾經對正式環境執行過的內容。特別注意 `sql/MIGRATION_ORDER.md` 最後「⚠️ 注意事項」段落：2026-06-05 有一次針對 anon 權限的收緊（移除 `registrations` 的 UPDATE/DELETE、`event_donors` 完全封鎖、`students` 改走 RPC）已直接套用在 Supabase 上，但**這個 `sql/` 目錄底下沒有任何檔案記錄這次變更** — 若要在新環境重建，需要額外執行不在此 repo 中的 `fix_rls_clean.sql` 才能達到一致狀態。

### 路由結構（`src/App.jsx`）

三種信任層級：
- **公開、免登入** — `/`（KioskPage，刷卡報名 kiosk）、`/activities`、`/activities/:id`、`/leader`（QR code 入口跳轉）、`/car-checkin/:token`（用 token 驗身，非 session 登入）
- **後台、需登入 session** — `/admin/*` 底下所有頁面皆包在 `<ProtectedRoute>`（`src/components/ProtectedRoute.jsx`）；沒有 session 會導向 `/admin/login`
- **後台管理員專用 vs 一般義工** — `<ProtectedRoute adminOnly>` 進一步依 `role`（`admin` 或 `volunteer`，讀自 `src/lib/auth.jsx` 的 `session.user.app_metadata.role`）限制存取；義工存取管理員專用頁面會被導回 `/admin/events`

### 核心領域模型

- **活動（Events）**（`events`）具備**動態欄位**（`event_fields` / `event_templates`）— 報名表單是在執行期依據 JSON 欄位 schema 動態產生（欄位型別列舉見 `src/lib/fieldTypes.js`：radio／checkbox／boolean／text／plate／datetime／date／time），並由 `src/components/DynamicForm.jsx` 負責渲染。多場次活動另有 `event_sessions` / `event_session_fields`。
- **學員（Students）**是事先匯入的（`students` / `student_classes`），以學員證 QR code = 學員編號識別；kiosk 端查詢學員走 `get_student_by_qr` RPC。訪客／親友可在沒有 `student_id` 的情況下報名（`host_student_id` 會將訪客報名記錄連回代報的學員）。
- **排車系統**（`car_assignments`、`car_members`、`car_leaders`、`car_monks`）是疊加在報名資料之上的另一套排班子系統，依 `direction`（'up'／'down'）區分上下山 — 相關邏輯見 `src/lib/autoArrange.js` / `carrangeHelpers.js` 及後台排車相關頁面。小車報到使用依方向區分的 token（`access_token`）驗證，非 session 登入 — 相關安全性演進歷史見 `security_fix_car_token_security.sql`。
- **報名異動紀錄**透過 `logRegistrationChange()` 寫入 `registration_changes`（best-effort，失敗只會 `console.warn`，不會擋住主要寫入流程）。

### PWA／離線行為

`vite.config.js` 設定 `vite-plugin-pwa` 快取所有靜態資源，讓弱網環境下的 kiosk 平板仍可運作，但明確將所有打到 `*.supabase.co` 的請求設為 `NetworkOnly`（不快取）。同樣地，`src/lib/supabase.js` 也對每個 fetch 強制加上 `cache: 'no-store'`。修改這兩個檔案時務必維持這個設計 — 報名狀態的快取讀取是這個專案中反覆出現的一類 bug（詳見 SETUP.md 常見問題中關於跨裝置資料不一致的說明）。

### 歷史遺留檔案

`archive/` 目錄存放過去一次性使用的 Python 補丁腳本、`.bat` 部署腳本，以及其他已被淘汰的工具。這些不屬於目前的建置／部署流程 — 不要把它們當作目前工作流程的文件依據。
