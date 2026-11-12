import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * O pin é desenhado em CSS (ver `.pin-mapa`), com um `divIcon`.
 *
 * O Leaflet traz imagens próprias para o marcador, mas são carregadas por um
 * caminho relativo que o Vite não reescreve — ficariam partidas na versão
 * publicada. Um pin em CSS evita o problema e não acrescenta ficheiros.
 */
const PIN = L.divIcon({ className: 'pin-mapa', iconSize: [22, 22], iconAnchor: [11, 11] });

/**
 * Mapa com um pin.
 *
 * Serve os dois sítios onde há mapa: na página pública do produtor é só para
 * ver, e no perfil dele o pin arrasta-se. O componente não guarda coordenadas
 * nenhumas — recebe-as e, quando o pin é largado, devolve as novas pelo
 * `aoMover`. Quem manda é sempre o formulário.
 */
export default function Mapa({ latitude, longitude, aoMover, arrastavel = false }) {
  const elemento = useRef(null);
  const mapa = useRef(null);
  const pin = useRef(null);

  // O `aoMover` é guardado numa referência porque o mapa só é criado uma vez:
  // sem isto, o Leaflet ficaria agarrado à primeira versão da função.
  const aoMoverRef = useRef(aoMover);
  useEffect(() => {
    aoMoverRef.current = aoMover;
  });

  // --- Criar o mapa (uma só vez) ---
  useEffect(() => {
    const m = L.map(elemento.current).setView([latitude, longitude], 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(m);

    const p = L.marker([latitude, longitude], { draggable: arrastavel, icon: PIN }).addTo(m);
    p.on('dragend', () => {
      const { lat, lng } = p.getLatLng();
      // 6 casas decimais chegam para distinguir casas ao lado uma da outra
      aoMoverRef.current(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
    });

    mapa.current = m;
    pin.current = p;

    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Seguir as coordenadas que vêm de fora (a morada procurada) ---
  useEffect(() => {
    if (!mapa.current) return;

    const ponto = L.latLng(latitude, longitude);
    pin.current.setLatLng(ponto);

    // Só mexe no mapa se o pin tiver saído do que está à vista. Assim,
    // arrastar o pin não faz o mapa saltar debaixo da mão.
    if (!mapa.current.getBounds().contains(ponto)) mapa.current.setView(ponto, 15);
  }, [latitude, longitude]);

  return <div className="mapa" ref={elemento} />;
}
