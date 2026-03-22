import { BASE_URL, SPECIES_GROUPS } from './constants';

export const API = {
    async detectAvailableSpecies(lat, lng) {
        const spatialParams = new URLSearchParams({
            f: 'json', distance: 50, geometry: JSON.stringify({ x: lng, y: lat }),
            outFields: '*', outSR: 4326, spatialRel: 'esriSpatialRelIntersects',
            units: 'esriSRUnit_Meter', geometryType: 'esriGeometryPoint', inSR: 4326,
            returnGeometry: 'true'
        });

        const promises = SPECIES_GROUPS.map(async (group) => {
            try {
                const layerResults = await Promise.all(
                    group.layers.map(id => 
                        fetch(`${BASE_URL}/${id}/query?${spatialParams}`)
                            .then(r => r.ok ? r.json() : { error: true })
                            .catch(() => ({ error: true }))
                    )
                );
                
                const allFeatures = layerResults.flatMap(res => res.features || []);
                if (allFeatures.length === 0) return null;

                // 【优化】合并重叠要素的 ID，并保留第一个有效要素的属性/几何作为代表
                const idSet = new Set();
                let bestAttributes = null;
                let bestGeometry = null;

                allFeatures.forEach(f => {
                    const rawId = f.attributes[group.layerKey];
                    if (rawId) rawId.split(',').forEach(s => idSet.add(s.trim()));
                    
                    // 优先选择有名称或有具体属性的要素作为主属性
                    if (!bestAttributes || (f.attributes.NAME && !bestAttributes.NAME)) {
                        bestAttributes = f.attributes;
                        bestGeometry = f.geometry;
                    }
                });

                return { 
                    group, 
                    attributes: bestAttributes || allFeatures[0].attributes,
                    geometry: bestGeometry || allFeatures[0].geometry,
                    allIds: Array.from(idSet) 
                };
            } catch (e) {
                console.error(`Query failed for group ${group.id}:`, e);
                return null;
            }
        });

        const results = await Promise.all(promises);
        return results.filter(r => r !== null);
    },

    async fetchRules(group, ids, waterTidalStatus) {
        if (!ids || ids.length === 0) return [];
        const idListStr = ids.map(id => `'${id}'`).join(',');
        let whereClause = `${group.tableKey} IN (${idListStr})`;

        if (group.id === 'non_sport') {
            // 【逻辑增强】根据原始逻辑文档，明确处理 IS_TIDAL 状态
            // 0: Inland, 1: Tidal, 2: Maybe (通常归类为内陆)
            if (waterTidalStatus === 1) {
                // 潮汐水域：显示潮汐规则或通用规则
                whereClause += ` AND (IS_TIDAL = 1 OR IS_TIDAL IS NULL)`;
            } else {
                // 非潮汐/可能潮汐水域：显示内陆(0)、混合(2)或通用规则
                whereClause += ` AND (IS_TIDAL = 0 OR IS_TIDAL = 2 OR IS_TIDAL IS NULL)`;
            }
        }

        const rulesParams = new URLSearchParams({
            f: 'json', outFields: '*', returnGeometry: 'false', where: whereClause
        });

        try {
            const res = await fetch(`${BASE_URL}/${group.table}/query?${rulesParams}`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.features || [];
        } catch (e) {
            console.error(`Fetch rules failed for ${group.id}:`, e);
            return [];
        }
    },

    /**
     * 【自愈功能】抓取元数据，并动态发现 Layer ID 以应对后台变动
     */
    async fetchMetadata() {
        const CACHE_KEY = 'fishing_metadata_v6';
        const cached = localStorage.getItem(CACHE_KEY);
        // 注意：由于我们需要动态发现 Layer ID，自愈逻辑建议每次启动都运行，或设置较短的缓存时间
        // 这里我们先读取缓存，但如果缓存不存在，则执行全量探测
        if (cached) return JSON.parse(cached);

        try {
            const [resAll, res10] = await Promise.all([
                fetch(`${BASE_URL}/layers?f=json`).then(r => r.json()),
                fetch(`${BASE_URL}/10?f=json`).then(r => r.json())
            ]);

            const speciesDict = {};
            const waterDefDict = {};
            const entities = [...(resAll.layers || []), ...(resAll.tables || [])];

            // 1. 实现版本自愈：动态匹配 Layer/Table ID
            SPECIES_GROUPS.forEach(group => {
                const keywords = group.searchKeywords;
                if (!keywords) return;

                // 匹配 Layers
                const foundLayerIds = entities
                    .filter(e => e.type !== 'Table' && keywords.layers.some(k => e.name.includes(k)))
                    .map(e => e.id);
                if (foundLayerIds.length > 0) group.layers = foundLayerIds;

                // 匹配 Table
                const foundTable = entities.find(e => e.type === 'Table' && e.name.includes(keywords.table));
                if (foundTable) group.table = foundTable.id;
            });

            // 2. 抓取翻译字典
            [...entities, res10].forEach(e => {
                if (e.fields) {
                    e.fields.forEach(f => {
                        const fname = f.name.toUpperCase();
                        if ((fname === 'SPECIES' || fname === 'WATERDEFINITION') && f.domain?.codedValues) {
                            f.domain.codedValues.forEach(cv => {
                                if (fname === 'SPECIES') speciesDict[String(cv.code)] = cv.name;
                                else waterDefDict[String(cv.code)] = cv.name;
                            });
                        }
                    });
                }
            });

            const finalData = { species: speciesDict, waterDef: waterDefDict };
            localStorage.setItem(CACHE_KEY, JSON.stringify(finalData));
            return finalData;
        } catch (e) {
            console.error("Self-healing & Metadata fetch failed:", e);
            return { species: {}, waterDef: {} };
        }
    }
};
