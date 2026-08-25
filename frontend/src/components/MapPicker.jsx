import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Locate, Loader2 } from "lucide-react";

// Default marker icons (CRA can't resolve from leaflet CSS)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ClickPin = ({ onPick }) => {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
};

const Recenter = ({ position }) => {
  const map = useMap();
  React.useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 13));
  }, [position, map]);
  return null;
};

const MapPicker = ({ lat, lng, onChange }) => {
  const [locating, setLocating] = useState(false);
  const hasPin = lat && lng;
  const fallback = [12.9716, 77.5946]; // Bangalore

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  return (
    <div data-testid="map-picker">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-vs-text-secondary flex items-center gap-1.5">
          <MapPin size={12} className="text-vs-gold" />
          {hasPin ? `Pinned: ${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Click the map to drop a pin"}
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          data-testid="use-my-location"
          className="text-xs flex items-center gap-1.5 text-vs-gold hover:underline"
        >
          {locating ? <Loader2 size={11} className="animate-spin" /> : <Locate size={11} />}
          Use my location
        </button>
      </div>
      <div className="h-72 rounded-lg overflow-hidden border border-vs-border" data-testid="map-container">
        <MapContainer
          center={hasPin ? [lat, lng] : fallback}
          zoom={hasPin ? 13 : 11}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          />
          <ClickPin onPick={onChange} />
          {hasPin && <Marker position={[lat, lng]} />}
          {hasPin && <Recenter position={[lat, lng]} />}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPicker;
