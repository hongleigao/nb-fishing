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
        this.tabsWrapper.className = 'px-5 py-2 border-b border-gray-50 flex space-x-4 overflow-x-auto no-scrollbar hidden';
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

    /**
     * 【优化】更新 DOM 状态属性，供 CSS 调用
     */
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
        this.sheet.style.transition = animate ? 'transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'none';
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
            this._updateStateAttr(); // 同步状态到 CSS
        };

        this.header.addEventListener('mousedown', onStart);
        this.header.addEventListener('touchstart', onStart, {passive: false});
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, {passive: false});
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);
    }

    expand() {
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
            btn.className = `flex-shrink-0 flex flex-col items-center pb-1 border-b-2 transition-all ${isActive ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-400'}`;
            btn.innerHTML = `<span class="text-lg">${group.icon}</span><span class="text-[10px]">${group.label}</span>`;
            btn.onclick = (e) => { e.stopPropagation(); callback(group.id); };
            this.tabsWrapper.appendChild(btn);
        });
    }

    renderRules(rules, dict, groupLabel = 'Fishing Rule') {
        if (!this.rulesContent || !this.dateInput) return;
        const date = dayjs(this.dateInput.value);
        this.rulesContent.innerHTML = '';
        this.rulesContent.classList.remove('hidden');
        document.getElementById('loading-state')?.classList.add('hidden');
        document.getElementById('empty-state')?.classList.add('hidden');

        if (rules.length === 0) {
            const emptyMsg = UI_STRINGS.STATE_RULE_EMPTY_TEMPLATE.replace('{group}', groupLabel);
            this.renderEmpty(emptyMsg);
            return;
        }

        rules.forEach(rule => {
            const a = rule.attributes;
            const open = this._checkActive(a, date);
            let name = groupLabel;
            if (a.SPECIES !== null && a.SPECIES !== undefined) name = dict[String(a.SPECIES)] || `ID:${a.SPECIES}`;
            else if (a.SPECIES_DESC) name = a.SPECIES_DESC;
            else if (a.SEASON_NAME) name = a.SEASON_NAME;

            this.rulesContent.insertAdjacentHTML('beforeend', `
                <div class="bg-white border ${open ? 'border-blue-100 shadow-sm' : 'border-gray-100 opacity-60'} rounded-lg overflow-hidden mb-3">
                    <div class="${open ? 'bg-[#1873b9]' : 'bg-gray-400'} px-3 py-1.5 flex justify-between items-center">
                        <span class="text-white font-bold text-sm">${name}</span>
                        <span class="text-white text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">
                            ${open ? UI_STRINGS.STATUS_OPEN : UI_STRINGS.STATUS_CLOSED}
                        </span>
                    </div>
                    <div class="p-2.5 space-y-1">
                        ${Object.keys(a).filter(k => !IGNORED_FIELDS.includes(k.toUpperCase()) && a[k] !== null && a[k] !== '').map(k => `
                            <div class="flex text-[13px] leading-relaxed">
                                <span class="text-gray-900 font-bold min-w-[85px]">${this._fmtK(k)}:</span>
                                <span class="text-gray-700 ml-1">${this._fmtV(k, a[k], a)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `);
        });

        // 【UX 优化】增加列表末尾的视觉提示
        this.rulesContent.insertAdjacentHTML('beforeend', `
            <div class="py-10 text-center">
                <div class="inline-block px-4 py-1 rounded-full bg-gray-50 border border-gray-100 text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                    End of Regulations
                </div>
            </div>
        `);
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
        if (uk.startsWith('MIN_SIZE_')) return `Min Size for ${this._fmtSubSpecies(uk.replace('MIN_SIZE_', ''))}`;
        if (uk.startsWith('MAX_SIZE_')) return `Max Size for ${this._fmtSubSpecies(uk.replace('MAX_SIZE_', ''))}`;
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
        document.getElementById('loading-state')?.classList.remove('hidden');
    }

    renderEmpty(m) {
        document.getElementById('loading-state')?.classList.add('hidden');
        const e = document.getElementById('empty-state');
        if (e) { e.classList.remove('hidden'); e.querySelector('p').innerText = m; }
    }

    showToast(m) {
        if (!this.toastElem) return;
        this.toastElem.innerText = m;
        this.toastElem.classList.remove('opacity-0');
        setTimeout(() => this.toastElem.classList.add('opacity-0'), 2000);
    }

    updateHeaderInfo(waterName, isTidal, waterDefCode, waterDefDict) {
        if (this.waterNameElem) this.waterNameElem.innerText = waterName || UI_STRINGS.VAL_UNNAMED_WATER;
        if (this.waterDefElem) this.waterDefElem.innerText = (waterDefDict && waterDefDict[String(waterDefCode)]) || waterDefCode || "-";
        if (this.tidalStatusElem) this.tidalStatusElem.innerText = isTidal !== null ? (TIDAL_DICT[isTidal] || `Maybe (${isTidal})`) : "Maybe";
    }
}
