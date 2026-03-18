import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_INITIAL_VIEW, MAP_INITIAL_ZOOM, MAP_LAYERS } from './constants';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIconRetina,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export class MapManager {
    constructor(containerId) {
        this.map = L.map(containerId, { zoomControl: false }).setView(MAP_INITIAL_VIEW, MAP_INITIAL_ZOOM);
        this.currentMarker = null;
        this.highlightLayer = null;
        this.userLocationMarker = null;
        this.userAccuracyCircle = null;
        
        this.layers = {
            street: L.tileLayer(MAP_LAYERS.STREET.url, { attribution: MAP_LAYERS.STREET.attribution, maxZoom: 19 }),
            satellite: L.tileLayer(MAP_LAYERS.SATELLITE.url, { attribution: MAP_LAYERS.SATELLITE.attribution, maxZoom: 19 })
        };

        this.layers.street.addTo(this.map);
        this.currentLayerType = 'street';
    }

    highlightGeometry(geometry) {
        if (this.highlightLayer) this.map.removeLayer(this.highlightLayer);
        if (!geometry) return;
        try {
            if (geometry.rings) {
                const latlngs = geometry.rings.map(ring => ring.map(p => [p[1], p[0]]));
                this.highlightLayer = L.polygon(latlngs, { color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.3 }).addTo(this.map);
            } else if (geometry.paths) {
                const latlngs = geometry.paths.map(path => path.map(p => [p[1], p[0]]));
                this.highlightLayer = L.polyline(latlngs, { color: '#3b82f6', weight: 6, opacity: 0.6 }).addTo(this.map);
            }
        } catch (e) { console.error(e); }
    }

    zoomIn() { this.map.zoomIn(); }
    zoomOut() { this.map.zoomOut(); }

    switchLayer(type) {
        if (type === this.currentLayerType) return;
        if (type === 'satellite') {
            this.map.removeLayer(this.layers.street);
            this.layers.satellite.addTo(this.map);
        } else {
            this.map.removeLayer(this.layers.satellite);
            this.layers.street.addTo(this.map);
        }
        this.currentLayerType = type;
    }

    panToVisualCenter(lat, lng, isInitialLoad = false) {
        this.map.invalidateSize(false);
        const zoom = isInitialLoad ? 12 : this.map.getZoom();
        const point = this.map.project([lat, lng], zoom);
        const mapHeight = window.innerHeight - 50; 
        const visibleHeight = (window.innerHeight * 0.35) - 50;
        const offsetY = (mapHeight / 2) - (visibleHeight / 2);
        point.y += offsetY;
        const targetLatLng = this.map.unproject(point, zoom);
        if (isInitialLoad) this.map.setView(targetLatLng, zoom, { animate: false });
        else this.map.panTo(targetLatLng, { animate: true, duration: 0.5 });
    }

    updateMarker(lat, lng, isInitialLoad = false) {
        if (this.currentMarker) this.map.removeLayer(this.currentMarker);
        this.currentMarker = L.marker([lat, lng]).addTo(this.map);
        this.panToVisualCenter(lat, lng, isInitialLoad);
    }

    updateUserLocation(latlng, accuracy) {
        if (this.userLocationMarker) this.map.removeLayer(this.userLocationMarker);
        if (this.userAccuracyCircle) this.map.removeLayer(this.userAccuracyCircle);
        this.userAccuracyCircle = L.circle(latlng, { radius: accuracy / 2, color: '#1873b9', weight: 1, fillColor: '#1873b9', fillOpacity: 0.15 }).addTo(this.map);
        this.userLocationMarker = L.circleMarker(latlng, { radius: 6, fillColor: '#2563eb', color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 1 }).addTo(this.map);
        this.panToVisualCenter(latlng.lat, latlng.lng, false);
    }

    onMapClick(callback) { this.map.on('click', (e) => callback(e.latlng.lat, e.latlng.lng)); }
    locate() { this.map.locate({ setView: false, maxZoom: 16, enableHighAccuracy: false, timeout: 5000 }); }
    
    // 【修复】补全丢失的方法
    onLocationFound(callback) { this.map.on('locationfound', callback); }
    onLocationError(callback) { this.map.on('locationerror', callback); }
}
