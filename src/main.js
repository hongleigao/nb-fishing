import './input.css';
import dayjs from 'dayjs';
import { API } from './api';
import { MapManager } from './mapManager';
import { UIController } from './uiController';
import { UI_STRINGS } from './constants';

class App {
    constructor() {
        this.ui = new UIController();
        this.mapManager = new MapManager('map');
        setTimeout(() => { if (this.mapManager.map) this.mapManager.map.invalidateSize(); }, 300);
        
        // 存储包含 species 和 waterDef 的元数据对象
        this.metadata = { species: {}, waterDef: {} };
        this.availableHits = [];
        this.currentLocation = null;
        if (this.ui.dateInput) this.ui.dateInput.value = dayjs().format('YYYY-MM-DD');
        this._init();
    }

    async _init() {
        this.mapManager.onMapClick((lat, lng) => this.handleLocationChange(lat, lng));
        document.getElementById('locate-btn')?.addEventListener('click', () => this.mapManager.locate());
        document.getElementById('layer-toggle-btn')?.addEventListener('click', () => {
            const next = this.mapManager.currentLayerType === 'street' ? 'satellite' : 'street';
            this.mapManager.switchLayer(next);
            this.ui.showToast(next === 'street' ? UI_STRINGS.TOAST_MODE_STREET : UI_STRINGS.TOAST_MODE_SATELLITE);
        });
        document.getElementById('zoom-in-btn')?.addEventListener('click', () => this.mapManager.zoomIn());
        document.getElementById('zoom-out-btn')?.addEventListener('click', () => this.mapManager.zoomOut());
        document.getElementById('share-btn')?.addEventListener('click', () => this.handleShare());
        this.mapManager.onLocationFound((e) => this.mapManager.updateUserLocation(e.latlng, e.accuracy));
        this.mapManager.onLocationError(() => this.ui.showToast(UI_STRINGS.TOAST_LOCATE_FAIL));
        this.handleUrlParams();
        
        // 【核心修复】抓取完整的元数据包
        this.metadata = await API.fetchMetadata();
    }

    async handleLocationChange(lat, lng, isInitial = false) {
        this.currentLocation = { lat, lng };
        this.mapManager.updateMarker(lat, lng, isInitial);
        this.ui.showLoading();
        if (this.ui.tabsWrapper) this.ui.tabsWrapper.classList.add('hidden');

        try {
            this.availableHits = await API.detectAvailableSpecies(lat, lng);
            if (this.availableHits.length === 0) {
                this.ui.updateHeaderInfo(null, null, null, null);
                this.ui.renderEmpty(UI_STRINGS.STATE_NO_DATA);
                this.mapManager.highlightGeometry(null);
                return;
            }

            const first = this.availableHits[0].attributes;
            // 【优化】传递 WATERDEFINITION 代码和翻译字典
            this.ui.updateHeaderInfo(
                first.NAME1 || first.WATER_NAME, 
                first.IS_TIDAL, 
                first.WATERDEFINITION,
                this.metadata.waterDef
            );
            
            this.ui.expand();
            this.mapManager.highlightGeometry(this.availableHits[0].geometry);
            await this.switchTab(this.availableHits[0].group.id);
        } catch (err) {
            console.error(err);
            this.ui.renderEmpty("Network Error");
        }
    }

    async switchTab(groupId) {
        this.currentGroupId = groupId;
        this.ui.renderTabs(this.availableHits, groupId, (id) => this.switchTab(id));
        const hit = this.availableHits.find(h => h.group.id === groupId);
        if (hit) {
            this.mapManager.highlightGeometry(hit.geometry);
            const rules = await API.fetchRules(hit.group, hit.allIds, hit.attributes.IS_TIDAL);
            // 【优化】使用 metadata.species 字典
            this.ui.renderRules(rules, this.metadata.species, hit.group.label);
        }
    }

    handleShare() {
        if (!this.currentLocation) return this.ui.showToast(UI_STRINGS.TOAST_SELECT_WATER);
        const url = `${window.location.origin}${window.location.pathname}?lat=${this.currentLocation.lat}&lng=${this.currentLocation.lng}&date=${this.ui.dateInput.value}`;
        if (navigator.share) navigator.share({ title: UI_STRINGS.APP_TITLE, url }).catch(() => {});
        else { navigator.clipboard.writeText(url); this.ui.showToast(UI_STRINGS.TOAST_COPIED); }
    }

    handleUrlParams() {
        const p = new URLSearchParams(window.location.search);
        const lat = parseFloat(p.get('lat')), lng = parseFloat(p.get('lng'));
        if (!isNaN(lat) && !isNaN(lng)) {
            const d = p.get('date');
            if (d && this.ui.dateInput) this.ui.dateInput.value = d;
            this.handleLocationChange(lat, lng, true);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => { new App(); });
