import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { TIDAL_DICT, KEY_TRANSLATIONS, DIPNETTING_DICT, IGNORED_FIELDS, SUB_SPECIES_DICT, UI_STRINGS } from './constants';

dayjs.extend(utc);

export class UIController {
    constructor() {
        this.sheet = document.getElementById('bottom-sheet');
        this.header = document.getElementById('sheet-header');
        this.dateInput = document.getElementById('rule-date');
        this.waterNameElem = document.getElementById('water-name');
        this.waterDefElem = document.getElementById('water-definition');
        this.tidalStatusElem = document.getElementById('tidal-status');
        this.rulesContent = document.getElementById('rules-content');
        this.toastElem = document.getElementById('toast');
        
        this.tabsWrapper = document.createElement('div');
        this.tabsWrapper.className = 'px-5 py-2 border-b border-gray-50 flex space-x-4 overflow-x-auto no-scrollbar hidden transition-all duration-500';
        const container = document.getElementById('results-container');
        if (this.sheet && container) this.sheet.insertBefore(this.tabsWrapper, container);

        // 初始化状态
        this.snapState = 'PEEK';
        this._updateStateAttr(); 

        if (this.sheet && this.header) {
            this._initDrag();
            this._initStaticLabels();
        }
    }

    _updateStateAttr() {
        if (this.sheet) this.sheet.setAttribute('data-state', this.snapState);
    }

    _initStaticLabels() {
        const set = (selector, text) => {
            const el = document.querySelector(selector);
            if (el) el.innerText = text;
        };
        set('label[for="rule-date"]', UI_STRINGS.LABEL_DATE);
        set('#label-tidal-status', UI_STRINGS.LABEL_TIDAL_STATUS);
        set('#label-water-def', UI_STRINGS.LABEL_WATER_DEF);
        set('#empty-state p', UI_STRINGS.STATE_EMPTY);
        set('#loading-state p', UI_STRINGS.STATE_LOADING);
        set('h1', UI_STRINGS.APP_TITLE);
        set('.main-hint', UI_STRINGS.MAP_HINT);
    }

    _getTranslateY() {
        if (!this.sheet) return 0;
        const style = window.getComputedStyle(this.sheet);
        const transform = style.transform || style.webkitTransform;
        if (!transform || transform === 'none') return 0;
        const matrix = transform.match(/matrix\((.+)\)/);
        return matrix ? parseFloat(matrix[1].split(',')[5]) : 0;
    }

    _setPos(y, animate = false) {
        if (!this.sheet) return;
        this.sheet.style.transition = animate ? 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)' : 'none';
        this.sheet.style.transform = `translateX(-50%) translateY(${y}px)`;
    }

    _initDrag() {
        let isDragging = false, startY = 0, startTranslateY = 0, currentY = 0;
        const getThresholds = () => ({
            FULL: 0,
            HALF: window.innerHeight * 0.35,
            PEEK: (window.innerHeight - 50) - 45
        });

        const onStart = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            isDragging = true;
            startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            startTranslateY = this._getTranslateY();
            this.sheet.style.transition = 'none';
        };

        const onMove = (e) => {
            if (!isDragging) return;
            const y = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            const { FULL, PEEK } = getThresholds();
            currentY = Math.max(FULL, Math.min(startTranslateY + (y - startY), PEEK));
            this._setPos(currentY);
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            const { FULL, HALF, PEEK } = getThresholds();
            if (currentY < (FULL + HALF) / 2) {
                this._setPos(FULL, true);
                this.snapState = 'FULL';
            } else if (currentY < (HALF + PEEK) / 2) {
                this._setPos(HALF, true);
                this.snapState = 'HALF';
            } else {
                this._setPos(PEEK, true);
                this.snapState = 'PEEK';
            }
            this._updateStateAttr(); 
        };

        this.header.addEventListener('mousedown', onStart);
        this.header.addEventListener('touchstart', onStart, {passive: false});
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, {passive: false});
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);
    }

    expand() {
        if (!this.sheet) return;
        const viewportH = window.innerHeight;
        this._setPos(viewportH * 0.35, true);
        this.snapState = 'HALF';
        this._updateStateAttr();
    }

    renderTabs(hits, activeId, callback) {
        if (!this.tabsWrapper) return;
        this.tabsWrapper.classList.remove('hidden');
        this.tabsWrapper.innerHTML = '';
        hits.forEach(({ group }) => {
            const btn = document.createElement('button');
            const isActive = group.id === activeId;
            btn.className = `flex-shrink-0 flex flex-col items-center pb-2 border-b-2 transition-all duration-300 ${isActive ? 'border-blue-600 text-blue-600 font-black scale-105' : 'border-transparent text-gray-400 hover:text-gray-600'}`;
            btn.innerHTML = `<span class="text-xl mb-0.5">${group.icon}</span><span class="text-[9px] uppercase tracking-wider">${group.label}</span>`;
            btn.onclick = (e) => { e.stopPropagation(); callback(group.id); };
            this.tabsWrapper.appendChild(btn);
        });
    }

    renderRules(rules, dict, groupLabel = 'Fishing Rule') {
        if (!this.rulesContent || !this.dateInput) return;
        
        const date = dayjs(this.dateInput.value);
        this.rulesContent.innerHTML = '';
        this.rulesContent.classList.remove('hidden');
        
        ['loading-state', 'empty-state'].forEach(id => document.getElementById(id)?.classList.add('hidden'));

        if (!rules || rules.length === 0) {
            const emptyMsg = UI_STRINGS.STATE_RULE_EMPTY_TEMPLATE.replace('{group}', groupLabel);
            this.renderEmpty(emptyMsg);
            return;
        }

        const fragment = document.createDocumentFragment();
        
        rules.forEach(rule => {
            const attrs = rule.attributes;
            const isOpen = this._checkActive(attrs, date);
            
            let displayName = groupLabel;
            if (attrs.SPECIES !== null && attrs.SPECIES !== undefined) {
                displayName = dict.species?.[String(attrs.SPECIES)] || `Species ${attrs.SPECIES}`;
            } else if (attrs.SPECIES_DESC) {
                displayName = attrs.SPECIES_DESC;
            } else if (attrs.SEASON_NAME) {
                displayName = attrs.SEASON_NAME;
            }

            const card = document.createElement('div');
            card.className = `rule-card bg-white border ${isOpen ? 'border-blue-50 shadow-sm' : 'border-gray-100 opacity-60'} rounded-2xl overflow-hidden mb-4 border-l-4 ${isOpen ? 'border-l-blue-500' : 'border-l-gray-400'}`;
            
            // 提取关键指标
            const quota = attrs.DAILY_QUOTA;
            const minSize = attrs.MIN_SIZE || attrs.MINIMUM_LENGTH;

            card.innerHTML = `
                <div class="px-4 py-3 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Species</span>
                        <span class="text-slate-900 font-black text-base tracking-tight">${displayName}</span>
                    </div>
                    <div class="${isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} px-3 py-1 rounded-full font-black text-[10px] tracking-widest uppercase">
                        ${isOpen ? 'Open' : 'Closed'}
                    </div>
                </div>
                
                <div class="p-4">
                    <!-- 指标卡片区域 -->
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        <div class="metric-badge">
                            <div class="metric-label">Daily Limit</div>
                            <div class="metric-value">${quota ? (String(quota).padStart(2, '0')) : 'No Limit'}</div>
                        </div>
                        <div class="metric-badge">
                            <div class="metric-label">Min Size</div>
                            <div class="metric-value">${minSize ? this._fmtV('MIN_SIZE', minSize, attrs) : 'No Limit'}</div>
                        </div>
                    </div>

                    <!-- 详细列表 -->
                    <div class="space-y-1.5 border-t border-gray-50 pt-3">
                        ${Object.keys(attrs)
                            .filter(k => {
                                const uk = k.toUpperCase();
                                // 在详细列表中排除已在指标卡片展示的字段
                                return !IGNORED_FIELDS.includes(uk) && attrs[k] !== null && attrs[k] !== '' && 
                                       uk !== 'DAILY_QUOTA' && uk !== 'MIN_SIZE' && uk !== 'MINIMUM_LENGTH';
                            })
                            .map(k => `
                                <div class="flex items-start text-[12px] py-0.5">
                                    <span class="text-slate-400 font-bold min-w-[110px] shrink-0 uppercase tracking-tighter text-[10px] mt-0.5">${this._fmtK(k)}</span>
                                    <span class="text-slate-700 font-medium ml-2">${this._fmtV(k, attrs[k], attrs)}</span>
                                </div>
                            `).join('')}
                    </div>
                </div>
            `;
            fragment.appendChild(card);
        });

        const endDecorator = document.createElement('div');
        endDecorator.className = 'py-16 text-center';
        endDecorator.innerHTML = `
            <div class="inline-flex items-center space-x-3 opacity-20">
                <div class="h-[1px] w-8 bg-slate-900"></div>
                <div class="text-[9px] font-black uppercase tracking-[0.3em]">End of Regulations</div>
                <div class="h-[1px] w-8 bg-slate-900"></div>
            </div>
        `;
        fragment.appendChild(endDecorator);

        this.rulesContent.appendChild(fragment);
    }

    _checkActive(a, t) {
        const startKey = a.OPEN_DATE_EXCEPTION ? 'OPEN_DATE_EXCEPTION' : (a.START_DATE ? 'START_DATE' : 'OPEN_DATE');
        const endKey = a.CLOSE_DATE_EXCEPTION ? 'CLOSE_DATE_EXCEPTION' : (a.END_DATE ? 'END_DATE' : 'CLOSE_DATE');
        if (a[startKey] && a[endKey]) {
            const o = dayjs.utc(a[startKey]), c = dayjs.utc(a[endKey]);
            const tv = t.month() * 100 + t.date(), sv = o.month() * 100 + o.date(), ev = c.month() * 100 + c.date();
            return sv <= ev ? (tv >= sv && tv <= ev) : (tv >= sv || tv <= ev);
        }
        return true;
    }

    _fmtK(k) { 
        const uk = k.toUpperCase();
        if (KEY_TRANSLATIONS[uk]) return KEY_TRANSLATIONS[uk];
        if (uk.startsWith('MIN_SIZE_')) return `Min: ${this._fmtSubSpecies(uk.replace('MIN_SIZE_', ''))}`;
        if (uk.startsWith('MAX_SIZE_')) return `Max: ${this._fmtSubSpecies(uk.replace('MAX_SIZE_', ''))}`;
        return k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    _fmtSubSpecies(code) { return SUB_SPECIES_DICT[code] || code; }

    _fmtV(k, v, a) {
        const uk = k.toUpperCase();
        if (uk === 'DAILY_QUOTA' && !v) return 'No Limit';
        if (uk.includes('LENGTH') || uk.includes('SIZE')) return `${String(v).replace(/cm/gi, '').trim() || 'N/A'} cm${a.TOTAL_LENGTH_FLAG == 1 ? ' (TL)' : ''}`;
        if (uk === 'SMELT_DIPNETTING') return DIPNETTING_DICT[v] ?? v;
        if (uk === 'IS_TIDAL') return TIDAL_DICT[v] ?? v;
        if (uk.includes('DATE') && typeof v === 'number') {
            const d = dayjs.utc(v);
            return d.year() === 2000 ? d.format(UI_STRINGS.DATE_FMT_SHORT) : d.format(UI_STRINGS.DATE_FMT_FULL);
        }
        return v;
    }

    showLoading() {
        if (this.rulesContent) this.rulesContent.classList.add('hidden');
        const loader = document.getElementById('loading-state');
        if (loader) {
            loader.classList.remove('hidden');
            loader.innerHTML = `
                <div class="flex flex-col items-center justify-center space-y-6">
                    <div class="loader"></div>
                    <div class="space-y-2 text-center">
                        <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synchronizing</p>
                        <p class="text-sm font-bold text-slate-900 italic">ArcGIS Remote Server</p>
                    </div>
                </div>
            `;
        }
    }

    renderEmpty(m) {
        document.getElementById('loading-state')?.classList.add('hidden');
        const e = document.getElementById('empty-state');
        if (e) { e.classList.remove('hidden'); e.querySelector('p').innerText = m; }
    }

    showToast(m) {
        if (!this.toastElem) return;
        this.toastElem.innerText = m;
        this.toastElem.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl z-[3000] transition-all duration-500 transform translate-y-0 opacity-100';
        setTimeout(() => {
            this.toastElem.classList.add('opacity-0', '-translate-y-4');
        }, 2500);
    }

    updateHeaderInfo(waterName, isTidal, waterDefCode, waterDefDict) {
        if (this.waterNameElem) {
            this.waterNameElem.innerText = waterName || UI_STRINGS.VAL_UNNAMED_WATER;
            this.waterNameElem.classList.toggle('text-slate-400', !waterName);
            this.waterNameElem.classList.toggle('italic', !waterName);
        }
        if (this.waterDefElem) {
            const defText = (waterDefDict && waterDefDict[String(waterDefCode)]) || waterDefCode || "-";
            this.waterDefElem.innerText = defText;
        }
        if (this.tidalStatusElem) {
            this.tidalStatusElem.innerText = isTidal !== null ? (TIDAL_DICT[isTidal] || `Maybe (${isTidal})`) : "Maybe";
        }
    }
}
