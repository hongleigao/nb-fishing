// 环境配置
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://gis-erd-der.gnb.ca/gisserver/rest/services/Fishing_Regs_Site/Rivers_Lakes/MapServer";

export const MAP_LAYERS = {
    STREET: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors'
    },
    SATELLITE: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri'
    }
};

export const MAP_INITIAL_VIEW = [45.331, -66.068];
export const MAP_INITIAL_ZOOM = 10;
export const NAVBAR_HEIGHT = 50; 
export const DEFAULT_TOP_VH = 35; 
export const PEEK_HEIGHT = 45; 

export const UI_STRINGS = {
    APP_TITLE: "NB Fishing Rules",
    MAP_HINT: "Click water body to query",
    LABEL_DATE: "Query Date:",
    LABEL_TIDAL_STATUS: "Is Tidal:",
    LABEL_WATER_DEF: "Water Definition:",
    STATUS_OPEN: "✅ OPEN",
    STATUS_CLOSED: "🚫 CLOSED",
    STATE_EMPTY: "Click map above to get rules",
    STATE_LOADING: "Querying database...",
    STATE_NO_DATA: "No official fishing data for this location",
    // 【优化】支持动态物种名
    STATE_RULE_EMPTY_TEMPLATE: "No specific regulations for {group} in this water",
    VAL_UNNAMED_WATER: "Unnamed Water Body",
    TOAST_COPIED: "🔗 Link copied!",
    TOAST_SELECT_WATER: "Please select a water body first",
    TOAST_LOCATE_FAIL: "Locate failed, check permissions",
    TOAST_MODE_STREET: "Mode: Street",
    TOAST_MODE_SATELLITE: "Mode: Satellite",
    DATE_FMT_SHORT: "MMM DD",
    DATE_FMT_FULL: "YYYY-MM-DD"
};

export const SPECIES_GROUPS = [
    { 
        id: 'non_sport', label: 'Non-Sport Fishing', icon: '🐟',
        layers: [0, 1], table: 10, 
        layerKey: 'NON_SPORT_FISHING_ID', tableKey: 'NONSPORT_FISHING_REGS_ID',
        searchKeywords: { layers: ['Non-Sport', 'Non Sport'], table: 'NonSport' } 
    },
    { 
        id: 'trout', label: 'Trout', icon: '🐠',
        layers: [8, 9], table: 13, 
        layerKey: 'TROUT_ID', tableKey: 'TROUT_REG_IDS',
        searchKeywords: { layers: ['Trout'], table: 'Trout' } 
    },
    { 
        id: 'atlantic_salmon', label: 'Atlantic Salmon', icon: '🎣',
        layers: [2, 3], table: 11, 
        layerKey: 'ATLANTIC_SALMON_ID', tableKey: 'ATLANTIC_SALMON_REG_IDS',
        searchKeywords: { layers: ['Atlantic Salmon'], table: 'Atlantic Salmon' } 
    },
    { 
        id: 'landlocked_salmon', label: 'Landlocked Salmon', icon: '🦈',
        layers: [4, 5], table: 12, 
        layerKey: 'LANDLOCKED_SALMON_ID', tableKey: 'LANDLOCKED_SALMON_REG_IDS',
        searchKeywords: { layers: ['Landlocked Salmon'], table: 'Landlocked Salmon' } 
    },
    { 
        id: 'smallmouth_bass', label: 'Smallmouth Bass', icon: '🍀',
        layers: [6, 7], table: 14, 
        layerKey: 'SMALLMOUTH_BASS_ID', tableKey: 'SMALLMOUTH_BASS_REG_IDS',
        searchKeywords: { layers: ['Smallmouth Bass'], table: 'Smallmouth Bass' } 
    }
];

export const IGNORED_FIELDS = [
    'OBJECTID', 'NON_SPORT_FISHING_ID', 'IS_TIDAL', 'SHAPE', 'GLOBALID', 
    'TOTAL_LENGTH_FLAG', 'WATER_ID', 'SPECIES', 'SPECIES_DESC', 'WATERID',
    'ATLANTIC_SALMON_ID', 'TROUT_ID', 'SMALLMOUTH_BASS_ID', 'LANDLOCKED_SALMON_ID',
    'NONSPORT_FISHING_REGS_ID', 'ATLANTIC_SALMON_REG_IDS', 'LANDLOCKED_SALMON_REG_IDS', 
    'TROUT_REG_IDS', 'SMALLMOUTH_BASS_REG_IDS', 'BAG_LIMIT_CONDITIONS_FR', 'REGS_FR', 'SECT_DESC_FR',
    'WATERDEFINITION' // 既然单独显示了，就在列表中忽略
];

export const KEY_TRANSLATIONS = {
    'DAILY_QUOTA': 'Daily Quota', 'MINIMUM_LENGTH': 'Min Length', 'MAXIMUM_LENGTH': 'Max Length',
    'OPEN_DATE_EXCEPTION': 'Open Date Exception', 'CLOSE_DATE_EXCEPTION': 'Close Date Exception',
    'OPEN_DATE': 'Open Date', 'CLOSE_DATE': 'Close Date', 'SMELT_DIPNETTING': 'Smelt Dipnetting',
    'START_DATE': 'Start Date', 'END_DATE': 'End Date',
    'BAG_LIMIT': 'Bag Limit', 'POSSESSION_LIMIT': 'Possession Limit', 'MIN_SIZE': 'Min Size',
    'MAX_SIZE': 'Max Size', 'SEASON_NAME': 'Season Name', 'IS_TIDAL': 'Is Tidal',
    'MIN_SIZE_BROOK_TROUT': 'Min Size for Brook Trout', 'MIN_SIZE_BROWN_TROUT': 'Min Size for Brown Trout',
    'MIN_SIZE_RAINBOW_TROUT': 'Min Size for Rainbow Trout', 'MIN_SIZE_LAKE_TROUT': 'Min Size for Lake Trout',
    'BAG_LIMIT_CONDITIONS_EN': 'Bag Limit Conditions'
};

export const SUB_SPECIES_DICT = {
    'BROOK_TROUT': 'Brook Trout', 'BROWN_TROUT': 'Brown Trout', 'RAINBOW_TROUT': 'Rainbow Trout', 'LAKE_TROUT': 'Lake Trout',
    'ARTIC_CHAR': 'Artic Char', 'ARCTIC_CHAR': 'Arctic Char', 'LANDLOCKED_SALMON': 'Landlocked Salmon',
    'ATLANTIC_SALMON': 'Atlantic Salmon', 'SMALLMOUTH_BASS': 'Smallmouth Bass', 'YELLOW_PERCH': 'Yellow Perch',
    'WHITE_PERCH': 'White Perch', 'PICKEREL': 'Pickerel', 'SHAD': 'Shad'
};

// 【优化】返回值改为 Yes/No/Maybe，匹配官方习惯
export const TIDAL_DICT = { 0: "No", 1: "Yes", 2: "Maybe" };
export const DIPNETTING_DICT = { 0: 'Prohibited', 1: 'Allowed', 2: 'Conditional' };
