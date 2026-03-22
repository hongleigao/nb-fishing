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
        
        // 确保地图容器大小在初始化后正确计算
        setTimeout(() => { 
            if (this.mapManager.map) this.mapManager.map.invalidateSize(); 
        }, 300);
        
        this.metadata = { species: {}, waterDef: {} };
        this.availableHits = [];
        this.currentLocation = null;
        this.currentGroupId = null;

        if (this.ui.dateInput) {
            this.ui.dateInput.value = dayjs().format('YYYY-MM-DD');
            this.ui.dateInput.addEventListener('change', () => {
                if (this.currentLocation && this.currentGroupId) {
                    this.switchTab(this.currentGroupId);
                }
            });
        }
        this._init();
    }

    async _init() {
        // 绑定地图与按钮事件
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

        // 处理 URL 参数实现深度链接分享
        this.handleUrlParams();
        
        // 异步预加载翻译元数据
        try {
            this.metadata = await API.fetchMetadata();
        } catch (err) {
            console.error("Failed to load metadata:", err);
        }
    }

    async handleLocationChange(lat, lng, isInitial = false) {
        this.currentLocation = { lat, lng };
        this.mapManager.updateMarker(lat, lng, isInitial);
        this.ui.showLoading();
        
        if (this.ui.tabsWrapper) this.ui.tabsWrapper.classList.add('hidden');

        try {
            // 空间探测：寻找附近水域和规则
            this.availableHits = await API.detectAvailableSpecies(lat, lng);
            
            if (this.availableHits.length === 0) {
                this.ui.updateHeaderInfo(null, null, null, null);
                this.ui.renderEmpty(UI_STRINGS.STATE_NO_DATA);
                this.mapManager.highlightGeometry(null);
                return;
            }

            // 获取第一个发现的有效属性进行头部展示
            const firstHit = this.availableHits[0];
            const attrs = firstHit.attributes;
            
            this.ui.updateHeaderInfo(
                attrs.NAME1 || attrs.WATER_NAME || attrs.WATER_BODY_NAME, 
                attrs.IS_TIDAL, 
                attrs.WATERDEFINITION,
                this.metadata.waterDef
            );
            
            // 自动拉起底栏并高亮水域
            this.ui.expand();
            this.mapManager.highlightGeometry(firstHit.geometry);
            
            // 默认展示第一个标签页的规则
            await this.switchTab(firstHit.group.id);
        } catch (err) {
            console.error("Location handle error:", err);
            this.ui.renderEmpty("Network or Server Error");
        }
    }

    async switchTab(groupId) {
        this.currentGroupId = groupId;
        const hit = this.availableHits.find(h => h.group.id === groupId);
        
        if (hit) {
            // 渲染选项卡栏
            this.ui.renderTabs(this.availableHits, groupId, (id) => this.switchTab(id));
            
            // 切换地图高亮（针对不同鱼种可能有不同的子水域定义）
            this.mapManager.highlightGeometry(hit.geometry);
            
            // 拉取详细法规并渲染
            const rules = await API.fetchRules(hit.group, hit.allIds, hit.attributes.IS_TIDAL);
            this.ui.renderRules(rules, this.metadata, hit.group.label);
        }
    }

    handleShare() {
        if (!this.currentLocation) return this.ui.showToast(UI_STRINGS.TOAST_SELECT_WATER);
        
        const params = new URLSearchParams({
            lat: this.currentLocation.lat.toFixed(6),
            lng: this.currentLocation.lng.toFixed(6),
            date: this.ui.dateInput.value
        });
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        
        if (navigator.share) {
            navigator.share({ title: UI_STRINGS.APP_TITLE, url: shareUrl }).catch(() => {});
        } else {
            navigator.clipboard.writeText(shareUrl);
            this.ui.showToast(UI_STRINGS.TOAST_COPIED);
        }
    }

    handleUrlParams() {
        const p = new URLSearchParams(window.location.search);
        const lat = parseFloat(p.get('lat')), lng = parseFloat(p.get('lng'));
        
        if (!isNaN(lat) && !isNaN(lng)) {
            const dateStr = p.get('date');
            if (dateStr && this.ui.dateInput) {
                this.ui.dateInput.value = dateStr;
            }
            // 模拟初始点击定位
            this.handleLocationChange(lat, lng, true);
        }
    }
}

// 启动应用
window.addEventListener('DOMContentLoaded', () => { 
    new App(); 
});
