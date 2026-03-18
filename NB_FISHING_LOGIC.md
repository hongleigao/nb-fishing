# NB Fishing Rules App - Technical Blueprint & Requirements
# NB 钓鱼规则查询应用 - 技术蓝图与需求文档

---

## 1. Project Structure / 项目目录结构

```text
/nb-fishing
├── src/
│   ├── api.js           # Data Fetching / 数据抓取: ArcGIS REST API client, spatial queries, metadata.
│   ├── constants.js     # Config & i18n / 配置与国际化: API URLs, species mapping, UI strings, translations.
│   ├── mapManager.js    # Map Engine / 地图引擎: Leaflet init, layer switch, highlighting, geolocation.
│   ├── uiController.js  # UI Engine / UI 控制器: Bottom sheet snap logic, tab rendering, data formatting.
│   ├── main.js          # App Orchestrator / 应用导演: Entry point, event binding, coordination.
│   └── input.css        # Styles / 样式: Tailwind directives, custom components (loader, scrollbars).
├── index.html           # Layout / 布局: Main HTML5 structure and UI containers.
├── package.json         # Dependencies / 依赖管理: NPM packages (Leaflet, Dayjs, Vite).
├── vite.config.js       # Build Tool / 构建工具: Vite configuration.
├── tailwind.config.js   # Style Config / 样式配置: Tailwind CSS settings.
├── postcss.config.js    # CSS Processing / CSS 后处理: Autoprefixer integration.
├── .env                 # Environment / 环境变量: API Base URL.
└── NB_FISHING_LOGIC.md  # Documentation / 文档: This logic manual.
```

---

## 2. Tech Stack & Constraints / 技术栈与底层约束

### English:
- **UI Framework**: Vanilla JavaScript (ES6+) + Tailwind CSS.
- **Map Engine**: Leaflet.js (v1.9.4).
- **Date Library**: Dayjs (with UTC plugin for timezone-independent checks).
- **Base Layers**: OpenStreetMap (Street) and Esri World Imagery (Satellite).
- **Architecture**: Modular "Controller-Service" pattern. High decoupling between UI, Map, and API.
- **Constraint**: Must handle Leaflet asset paths explicitly in Vite environment.

### 中文:
- **UI 框架**: 原生 JavaScript (ES6+) + Tailwind CSS。
- **地图引擎**: Leaflet.js (v1.9.4)。
- **日期处理**: Dayjs (配合 UTC 插件，确保在全球任何时区对渔季的判断都准确无误)。
- **底图要求**: 标准街道图 (OpenStreetMap) 与 高清卫星图 (Esri World Imagery)。
- **架构限制**: 采用模块化“导演-服务”模式。UI、地图和 API 逻辑高度解耦。
- **特别要求**: 在 Vite 环境下必须显式处理 Leaflet 的图标资产路径。

---

## 3. Official Logic & API Relationships / 官方逻辑与接口关系

### English:
The app reverses the logic of the [NB Official Fishing Portal](https://dnr-mrn.gnb.ca/FishRegulation/).
- **Data Source**: ArcGIS MapServer with 15+ layers/tables.
- **Spatial Relationship**: Uses `esriSpatialRelIntersects`.
- **Jurisdictional Split**: Non-Sport rules are filtered by the water's `IS_TIDAL` property (1: Tidal, 0: Inland).
- **Multi-ID Support**: One water body can link to multiple regulation IDs (e.g., `LS001, LS002`).

### 中文:
本应用深度还原了 [NB 官方钓鱼门户](https://dnr-mrn.gnb.ca/FishRegulation/) 的底层逻辑。
- **数据源**: 基于 ArcGIS MapServer，包含 15 个以上的图层与关联表。
- **空间关系**: 使用 `esriSpatialRelIntersects`（空间相交）进行查询。
- **管辖权划分**: 非运动鱼类规章根据水域物理属性 `IS_TIDAL` 严格过滤（1 为潮汐水域，0 为内陆水域）。
- **多 ID 关联**: 支持一个水域同时关联多个规章 ID（如圣约翰河可能同时对应 `LS001` 和 `LS002`）。

---

## 4. App Logic & Data Pipeline / 本 App 逻辑与数据管线

### Pipeline / 查询管线:
1.  **Click Map / 点击地图**: Triggered by Leaflet click event.
2.  **Detection (Layers 0-9) / 探测**: 
    - Query with a **50m buffer** (balanced for touch precision).
    - Capture `NAME1`, `IS_TIDAL`, `WATERDEFINITION`, and all associated IDs.
    - Fetch `geometry` for visual feedback.
3.  **Metadata (Layers?f=json & 10?f=json) / 元数据**:
    - Fetch and cache species and water definition dictionaries on load.
4.  **Regulations (Tables 10-14) / 规章检索**:
    - Fetch rules using `IN (...)` syntax.
    - Apply smart filtering based on `IS_TIDAL` for Non-Sport fish.
5.  **Rendering / 渲染**:
    - Format dynamic keys (e.g., `MIN_SIZE_BROOK_TROUT` -> `Min Size for Brook Trout`).
    - Apply 3-state snap to Bottom Sheet (PEEK, HALF, FULL).

---

## 5. UI/UX Interaction Points / UI/UX 交互要点

### English:
- **Geometry Highlighting**: Real-time blue overlay of the water body boundary upon selection.
- **Three-Stage Bottom Sheet**: Supports dragging to PEEK (45px), HALF (default view), and FULL (scrollable reading).
- **Dynamic Padding**: In HALF state, the list has extra bottom padding (`40dvh`) to prevent rules from being hidden below the screen edge.
- **Floating Button Island**: Logical vertical grouping of Zoom In, Zoom Out, Layer Toggle, and Locate.

### 中文:
- **区域高亮**: 选中后，地图实时绘制水域边界或河流中心线的蓝色半透明遮罩。
- **三段式滑动面板**: 支持拖拽至 PEEK（露边 45px）、HALF（默认半屏）和 FULL（全屏阅读）三个档位。
- **动态留白**: 在 HALF 状态下，规则列表底部增加 `40dvh` 的超大留白，确保用户能滚过屏幕边缘看清最后一条规则。
- **悬浮按钮岛**: 纵向排列 [放大]、[缩小]、[切换卫星图]、[定位]，逻辑清晰，单手操作友好。

---

## 6. Formatting & i18n / 数据格式化与国际化

- **Smart Translation**: A regex-based engine translates DB fields like `MIN_SIZE_XXX` into human-readable English.
- **Unified Dictionary**: All strings reside in `src/constants.js` under `UI_STRINGS` for seamless multi-language switching.
- **UTC Enforcement**: Regulation dates are parsed as UTC to ensure the "Fishing Season" logic is 100% accurate regardless of user location.
