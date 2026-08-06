import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getComplaints } from '../services/api';

const severityTone = {
  Low: '#34d399',
  Medium: '#60a5fa',
  High: '#f59e0b',
  Critical: '#f87171',
  Emergency: '#fb7185',
};

const createMarkerIcon = (severity = 'Medium') => {
  const tone = severityTone[severity] || '#60a5fa';
  return L.divIcon({
    className: 'complaint-marker',
    html: `<div style="background:${tone};" class="marker-pulse"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export default function MapPage() {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    const loadComplaints = async () => {
      try {
        const data = await getComplaints();
        setComplaints(data);
      } catch (error) {
        console.error('Unable to load complaints for map', error);
      }
    };

    loadComplaints();
    const timer = window.setInterval(loadComplaints, 10000);
    return () => window.clearInterval(timer);
  }, []);

  const complaintPoints = useMemo(() => complaints.filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng)), [complaints]);
  const center = complaintPoints[0] ? [complaintPoints[0].lat, complaintPoints[0].lng] : [12.9716, 77.5946];

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="glass rounded-[28px] p-4">
          <MapContainer center={center} zoom={12} className="h-[70vh] w-full rounded-[20px]">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {complaintPoints.map((point) => (
              <Marker key={point.id} position={[point.lat, point.lng]} icon={createMarkerIcon(point.severity)}>
                <Popup>
                  <div>
                    <strong>{point.title}</strong>
                    <div>Severity: {point.severity}</div>
                    <div>Status: {point.status}</div>
                    <div>Department: {point.department}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
