# 测试计划与用例集 (Test Plan) - nb-fishing

## 1. 测试目标
确保 **nb-fishing** 的空间查询逻辑、法规匹配准确性以及 UI 状态机在各种移动端场景下的稳健性。

## 2. 测试策略 (Test Strategy)
由于项目强依赖远程 ArcGIS API，测试将分为三个维度：
1.  **逻辑测试 (Logic Verification)**：针对 `api.js` 和 `constants.js` 中的逻辑判断进行单元测试（Mock API 返回）。
2.  **集成测试 (Integration Test)**：在真实网络环境下，测试特定坐标（GPS 坐标）的返回结果是否符合预期。
3.  **UI 冒烟测试 (UI Smoke Test)**：验证 Bottom Sheet 在点击地图后的联动表现。

## 3. 核心测试用例 (Core Test Cases)

### 3.1 空间查询精度测试 (Spatial Logic)
| ID | 用例名称 | 输入场景 | 预期结果 |
|---|---|---|---|
| L01 | 缓冲区相交测试 | 点击湖心位置 (Open Water) | 成功识别所属 Zone 和水域名称 |
| L02 | 岸边容错测试 | 点击离岸边 10-20 米的陆地 | 50m 缓冲区应能成功捕获水域 |
| L03 | 重叠水域冲突 | 点击位于“大区”中的“特定保护区” | 系统应能识别并合并两层规则（或高亮主要层） |

### 3.2 业务规则匹配测试 (Business Rules)
| ID | 用例名称 | 输入场景 | 预期结果 |
|---|---|---|---|
| B01 | 潮汐过滤校验 | `IS_TIDAL = 1` 的水域 | 仅显示潮汐鱼类法规，隐藏内陆专属规则 |
| B02 | 禁渔期自动判断 | 设置系统日期为 1 月 (禁渔期) | UI 显示 🚫 CLOSED 状态及具体的禁渔日期 |
| B03 | 鱼种字典转换 | API 返回 `SpeciesID=11` | UI 准确转换为 "Atlantic Salmon" |

### 3.3 UI 状态机测试 (UX/UI States)
| ID | 用例名称 | 操作步骤 | 预期结果 |
|---|---|---|---|
| U01 | 抽屉拉起测试 | 点击地图后 | Bottom Sheet 自动从 PEEK (45px) 跳至 HALF (35%) |
| U02 | 详情滚动测试 | 在 HALF 状态向上滑动 | Bottom Sheet 切换至 FULL 状态，展示所有法条 |
| U03 | 异常状态提示 | 点击无数据的陆地深处 | 显示 `UI_STRINGS.STATE_NO_DATA` 的友好提示 |

### 3.4 关键地理坐标回归测试 (Key GPS Regression Tests)
用于验证核心水域的空间查询逻辑及法规解析准确性。

| ID | 坐标名称 | 经纬度坐标 | 预期水域 | 预期结果 (Tabs/Rules) |
|---|---|---|---|---|
| R01 | Hammond River | 45.480904, -65.899333 | Hammond River | 3 Tabs / 0 Rules (特定分类下) |
| R02 | Kennebecasis River | 45.485771, -65.924664 | Kennebecasis River | 3 Tabs / 13 Rules |
| R03 | Brawley Lake | 45.422311, -65.808792 | Brawley Lake | 3 Tabs / 13 Rules |
| R04 | Loch Lomond | 45.380608, -65.842438 | Loch Lomond | 4 Tabs / 11 Rules |

## 4. 自动化建议
建议使用 **Vitest** 进行逻辑层面的单元测试。示例测试结构：
```javascript
// api.test.js
test('should apply correct tidal filter for inland waters', async () => {
  const mockId = 'NON_SPORT_001';
  const query = API.fetchRules(SPECIES_GROUPS[0], [mockId], 0); // Inland
  expect(query.url).toContain('IS_TIDAL%20=%200%20OR%20IS_TIDAL%20=%202');
});
```

## 5. 已发现的潜在风险点 (Risk Summary)
*   **API 响应延迟**：在高并发查询（5 个图层同时发出）时，低端设备可能会有卡顿感。建议优化为并发限流。
*   **地理偏移**：ArcGIS 服务使用的 SRID (4326/3857) 与移动端定位的精度匹配问题。
*   **本地缓存失效**：如果官方更变了 Layer ID（如将 Trout 从 8/9 换到 10/11），系统会直接崩溃。建议引入版本自愈机制。
