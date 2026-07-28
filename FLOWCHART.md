# 普宜精舍報名系統 — 流程圖

> 本文件包含兩類圖表：**操作流程圖**（使用者在各頁面的操作路徑）與
> **資料流程圖**（資料在前端／Supabase RPC／資料表之間如何流動）。
> 圖表使用 [Mermaid](https://mermaid.js.org/) 語法，可在 GitHub、VS Code（含 Mermaid 外掛）
> 或任何支援 Mermaid 的 Markdown 檢視器中直接渲染。

---

## 一、操作流程圖（Operation Flow）

### 1.1 前台：學員本人刷卡報名（`/`，KioskPage）

```mermaid
flowchart TD
    A([平板待機畫面 /]) --> B[刷學員證 QR Code]
    B --> C{get_student_by_qr 查詢}
    C -- 查無此人 --> Z1[顯示「找不到學員」]
    Z1 --> A
    C -- 查到學員 --> D[顯示學員姓名／班別\n列出可報名活動]
    D --> E{是否已報名過此活動?}
    E -- 是 --> F[顯示已報名資訊 / 可修改或取消]
    F --> F1[kiosk_update_registration\n或 kiosk_cancel_registration]
    F1 --> A
    E -- 否 --> G[動態表單 DynamicForm\n依 event_fields 產生欄位]
    G --> H[填寫答案／選擇是否為駕駛]
    H --> I[kiosk_submit_registration RPC]
    I -- 成功 --> J[顯示報名成功／QR 小卡]
    I -- 失敗 --> K[顯示錯誤訊息]
    J --> A
    K --> G
```

### 1.2 前台：代報親友／訪客報名（同一 KioskPage 內的分支）

```mermaid
flowchart TD
    A([學員本人已刷卡登入]) --> B[點選「幫親友報名」]
    B --> C[輸入親友姓名／電話（選填）]
    C --> D[動態表單填寫親友答案]
    D --> E[kiosk_submit_friend_registration RPC\nhost_student_id = 學員本人 student_id]
    E -- 成功 --> F[顯示親友報名成功]
    E -- 失敗 --> G[顯示錯誤訊息]
    F --> A
    G --> C

    subgraph 事後管理
    H[學員本人可在名單中\n看到自己代報的親友記錄] --> I[可取消親友報名]
    end
```

### 1.3 公開：領隊掃卡入口（`/leader`，LeaderScanPage）

```mermaid
flowchart TD
    A([開啟 /leader，領隊平板]) --> B[刷學員證 QR Code]
    B --> C[get_leader_cars RPC\n依 student_id 找出所屬車輛]
    C -- 是領隊/司機 --> D[自動導向對應\n/car-checkin/:token 頁面]
    C -- 非領隊 --> E[顯示「非領隊身分」]
```

### 1.4 公開：小車／遊覽車報到（`/car-checkin/:token`，CarCheckinPage）

```mermaid
flowchart TD
    A([領隊開啟 /car-checkin/:token\n不需登入，token 驗身]) --> B[get_car_by_token RPC\n驗證 token 是否有效]
    B -- 無效 --> Z[顯示「連結無效或已過期」]
    B -- 有效 --> C[顯示該車方向 up/down\n與車上成員名單]
    C --> D{報到方式}
    D -- 逐一報到 --> E[checkin_car_member RPC]
    D -- 全車一鍵報到 --> F[checkin_all_car RPC]
    D -- 法師報到 --> G[checkin_car_monk RPC]
    E --> C
    F --> C
    G --> C
```

### 1.5 後台：登入與權限判斷

```mermaid
flowchart TD
    A([/admin/login]) --> B[Supabase Auth 帳密登入]
    B -- 失敗 --> A
    B -- 成功 --> C[取得 session\napp_metadata.role]
    C --> D{ProtectedRoute 檢查}
    D -- 無 session --> A
    D -- 有 session --> E{role 是否為 admin?}
    E -- volunteer 存取 adminOnly 頁面 --> F[導回 /admin/events]
    E -- 符合權限 --> G[進入對應後台頁面\n活動管理／學員管理／排車…]
```

### 1.6 後台：現場報到（`/admin/events/:id/checkin`，CheckinPage）

```mermaid
flowchart TD
    A([進入活動報到頁]) --> B[刷學員證 QR 或搜尋姓名]
    B --> C[比對 registrations 名單]
    C -- 已報名 --> D[標記報到 update registrations.checked_in]
    C -- 未報名 --> E[提示「未報名」／可現場新增(walk-in)]
    D --> A
    E --> A
```

---

## 二、資料流程圖（Data Flow）

### 2.1 整體架構：無後端，前端直連 Supabase

```mermaid
flowchart LR
    subgraph Client["瀏覽器 / 平板（React SPA，Vite + PWA）"]
        UI[React 元件]
        LIB["src/lib/supabase.js\n所有資料存取集中於此"]
        UI --> LIB
    end

    subgraph Supabase["Supabase 專案"]
        AUTH[Supabase Auth\napp_metadata.role]
        PGREST[PostgREST API\nanon key 對外]
        RLS["Row Level Security\n政策"]
        RPC["SECURITY DEFINER\nRPC functions"]
        DB[(Postgres 資料表)]

        PGREST --> RLS
        RLS --> DB
        PGREST --> RPC
        RPC --> DB
    end

    LIB -- "帳密登入 / getSession" --> AUTH
    LIB -- ".from(table).select/insert/update\n(受 RLS 限制)" --> PGREST
    LIB -- ".rpc(function_name, params)\n(公開頁面寫入走這條)" --> PGREST
    AUTH -. "JWT 內含 app_metadata.role\n供 RLS 政策判斷" .-> RLS
```

**安全邊界說明**：anon key 是公開寫在前端打包檔裡的，因此：
- 公開頁面（kiosk 報名／編輯／取消、車輛報到、領隊掃卡）的所有寫入，一律呼叫 `RPC`（`SECURITY DEFINER`），不直接對 `registrations` / `students` 做 `.insert()/.update()`。
- 後台頁面（已登入）的讀寫則由 `RLS` 政策依 `auth.jwt()->'app_metadata'->>'role'` 判斷是否放行。

### 2.2 報名寫入的資料流（以學員本人報名為例）

```mermaid
sequenceDiagram
    participant U as 使用者（平板）
    participant FE as React (KioskPage)
    participant PG as PostgREST (anon)
    participant FN as RPC: kiosk_submit_registration
    participant T1 as students
    participant T2 as event_fields
    participant T3 as registrations
    participant T4 as registration_changes

    U->>FE: 刷 QR Code
    FE->>PG: rpc('get_student_by_qr', {code})
    PG->>T1: SELECT ... WHERE qr_code = code
    T1-->>FE: 學員資料 + student_classes
    FE->>PG: rpc('kiosk_submit_registration', {p_event_id, p_student_id, p_answers, ...})
    PG->>FN: 呼叫 SECURITY DEFINER function
    FN->>T2: 讀取該活動動態欄位定義（驗證 answers 結構，視實作而定）
    FN->>T3: INSERT INTO registrations (event_id, student_id, answers, ...)
    FN-->>T4: best-effort 寫入異動紀錄（失敗僅 console.warn，不擋主流程）
    FN-->>FE: { success, registration_id }
    FE-->>U: 顯示報名成功
```

### 2.3 排車系統資料流

```mermaid
flowchart TD
    A[registrations\nis_driver 標記] --> B["autoArrange.js / carrangeHelpers.js\n（後台排車頁面觸發）"]
    B --> C[(car_assignments\n依 event_id + direction)]
    C --> D[(car_members)]
    C --> E[(car_leaders)]
    C --> F[(car_monks)]
    C --> G["access_token\n（依方向產生）"]
    G --> H["/car-checkin/:token 頁面\nget_car_by_token RPC"]
    H --> I[checkin_car_member /\ncheckin_all_car /\ncheckin_car_monk RPC]
    I --> D
    I --> F
```

### 2.4 動態欄位／活動模板資料流

```mermaid
flowchart TD
    A[(event_templates)] -- "後台：套用模板" --> B[(event_fields)]
    C[後台 EventDetailPage\n手動增修欄位] --> B
    B -- "JSON 欄位 schema" --> D["DynamicForm.jsx\n依 field_type 動態產生表單\n(radio/checkbox/boolean/text/plate/datetime/date/time)"]
    D --> E[使用者填寫 answers JSONB]
    E --> F[(registrations.answers)]

    G[(event_sessions)] --> H[(event_session_fields)]
    H --> D
    G --> I[(registration_session_checkins)\n多場次報到記錄]
```

---

## 三、圖例對照（快速索引）

| 縮寫／代號 | 對應內容 |
|---|---|
| anon key | 前端打包檔內公開的 Supabase 金鑰，僅能透過 RLS/RPC 限定的方式存取資料 |
| RLS | Row Level Security，Postgres 資料列層級權限政策 |
| RPC | 透過 `supabase.rpc(...)` 呼叫的 `SECURITY DEFINER` Postgres function |
| app_metadata.role | 存於 `auth.users.raw_app_meta_data`，僅管理員可修改，決定 `admin` / `volunteer` |
| kiosk_* | 前台（anon，未登入）可呼叫的 RPC，命名前綴 |
| checkin_* / get_car_by_token / get_leader_cars | 排車報到相關 RPC |

> 對應的路由與領域模型細節請見 `CLAUDE.md`；SQL 遷移檔案順序請見 `sql/MIGRATION_ORDER.md`。
