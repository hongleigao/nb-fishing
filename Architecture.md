# 技术架构设计文档 (Architecture) - nb-fishing

## 1. 系统架构全景
**nb-fishing** 采用 **模块化解耦架构**，将复杂的空间地理查询与 UI 表现层完全分离。

### 1.1 模块职责划分
*   **Orchestrator (main.js)**：
    *   管理全局生命周期。
    *   作为 Map, API, UI 三者间的事件总线。
*   **Map Engine (mapManager.js)**：
    *   底层使用 Leaflet 渲染地图瓦片（Street/Satellite）。
    *   处理地图点击事件，返回地理坐标。
    *   负责高亮显示查询到的水域边界（Highlight Geometry）。
*   **API Service (api.js)**：
    *   负责与远程 ArcGIS MapServer 交互。
    *   实现空间缓冲区查询和规则过滤逻辑。
    *   缓存核心元数据（Metadata）以加速后续请求。
*   **UI Controller (uiController.js)**：
    *   管理 Bottom Sheet 的 3 阶段状态机（PEEK, HALF, FULL）。
    *   处理响应式渲染，将 API 数据转换为格式化的 HTML 卡片。

## 2. 核心数据流 (Data Flow)

### 2.1 查询流水线 (Query Pipeline)
1.  **用户点击地图** $\rightarrow$ `MapManager.on('click')` $\rightarrow$ 发送坐标。
2.  **触发空间检索** $\rightarrow$ `API.detectAvailableSpecies`：
    *   使用 `esriSpatialRelIntersects` 与 50 米缓冲区查询。
    *   **并发执行** 5 组针对不同鱼种图层（Layer 0-9）的请求。
3.  **规则匹配** $\rightarrow$ `API.fetchRules`：
    *   根据返回的 `WATER_ID` 或 `FISHING_ID` 列表，匹配对应的规则表（Table 10-14）。
    *   应用 ** jurisdictional 过滤**（IS_TIDAL 属性）。
4.  **UI 同步** $\rightarrow$ `UIController.renderRules`：
    *   清空旧数据，加载 Skeleton 屏。
    *   渲染新卡片，并将 Bottom Sheet 自动拉起至 HALF 状态。

## 3. 技术难点与关键逻辑

### 3.1 潮汐水域状态判断
系统通过 `IS_TIDAL` 状态（0=No, 1=Yes, 2=Maybe）实现法规的精准匹配。
*   **内陆环境 (0/2)**：不仅显示普通规则，还包含“内陆专属非竞技鱼类”规则。
*   **潮汐环境 (1)**：过滤掉内陆特有规则，仅展示潮汐法规。

### 3.2 高性能元数据缓存
*   **策略**：应用首次启动时全量抓取物种名、水域定义字典。
*   **存储**：使用浏览器 `localStorage` 进行持久化。
*   **版本控制**：目前使用硬编码版本号（v6），支持版本自愈后将更灵活。

## 4. API 版本自愈机制 (Self-Healing Logic)
为了应对 ArcGIS 服务器后台图层 ID 的变动，系统引入了自愈机制：
1.  **关键词映射**：在 `constants.js` 中为各鱼种定义 `searchKeywords`。
2.  **动态发现**：`API.fetchMetadata` 启动时拉取 `/layers?f=json`，通过名称正则匹配最新的 Layer ID。
3.  **内存覆盖**：自动将探测到的新 ID 更新至内存中的 `SPECIES_GROUPS`，无需重新发布代码即可适配后台结构调整。

## 5. 扩展性设计 (Future Proofing)
*   **多语言支持**：`constants.js` 已提取 UI_STRINGS，易于扩展法语或米克马克语。
*   **跨平台容器化**：基于 Vite 构建，极易通过 Capacitor 或 Cordova 打包为原生移动应用。
*   **离线地图包**：架构上支持切换为 MBTiles 或本地缓存瓦片，满足深山水库等无信号区的垂钓需求。
