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
            const layerResults = await Promise.all(
                group.layers.map(id => fetch(`${BASE_URL}/${id}/query?${spatialParams}`).then(r => r.json()))
            );
            const allFeatures = layerResults.flatMap(res => res.features || []);
            if (allFeatures.length === 0) return null;

            const idSet = new Set();
            allFeatures.forEach(f => {
                const rawId = f.attributes[group.layerKey];
                if (rawId) rawId.split(',').forEach(s => idSet.add(s.trim()));
            });

            return { 
                group, 
                attributes: allFeatures[0].attributes,
                geometry: allFeatures[0].geometry,
                allIds: Array.from(idSet) 
            };
        });

        const results = await Promise.all(promises);
        return results.filter(r => r !== null);
    },

    async fetchRules(group, ids, waterTidalStatus) {
        if (!ids || ids.length === 0) return [];
        const idListStr = ids.map(id => `'${id}'`).join(',');
        let whereClause = `${group.tableKey} IN (${idListStr})`;

        if (group.id === 'non_sport') {
            if (waterTidalStatus === 1) whereClause += ` AND (IS_TIDAL = 1 OR IS_TIDAL IS NULL)`;
            else if (waterTidalStatus === 0) whereClause += ` AND (IS_TIDAL = 0 OR IS_TIDAL = 2 OR IS_TIDAL IS NULL)`;
        }

        const rulesParams = new URLSearchParams({
            f: 'json', outFields: '*', returnGeometry: 'false', where: whereClause
        });

        const res = await fetch(`${BASE_URL}/${group.table}/query?${rulesParams}`);
        const data = await res.json();
        return data.features || [];
    },

    /**
     * 【升级】同时抓取 Species 和 WaterDefinition 的翻译字典
     */
    async fetchMetadata() {
        const CACHE_KEY = 'fishing_metadata_v5';
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) return JSON.parse(cached);

        try {
            const [resAll, res10] = await Promise.all([
                fetch(`${BASE_URL}/layers?f=json`).then(r => r.json()),
                fetch(`${BASE_URL}/10?f=json`).then(r => r.json())
            ]);

            const speciesDict = {};
            const waterDefDict = {};
            const entities = [...(resAll.layers || []), ...(resAll.tables || []), res10];

            entities.forEach(e => {
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
            console.error(e);
            return { species: {}, waterDef: {} };
        }
    }
};
