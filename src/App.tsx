import { useCallback, useEffect, useState } from 'react';
import DepthPhotoViewer from './components/DepthPhotoViewer';
import ImageUploader from './components/ImageUploader';
import SettingsPanel from './components/SettingsPanel';
import { useHeadTracking } from './hooks/useHeadTracking';
import type { ViewerSettings } from './types';

const initialSettings: ViewerSettings = {
  depthAmount: 0.2,
  viewShiftAmount: 0.52,
  zoom: 1.05,
  manualControls: false,
};

const logoUrl = `${import.meta.env.BASE_URL}3dify-logo-clean.png`;
const grapesDemoUrl = `${import.meta.env.BASE_URL}demo-photo.jpg`;
const cityDemoUrl = `${import.meta.env.BASE_URL}demo-city.jpg`;
const cakeDemoUrl = `${import.meta.env.BASE_URL}demo-cake.jpg`;
const babyDemoUrl = `${import.meta.env.BASE_URL}demo-baby.jpg`;
const demoPhotos = [
  { label: 'Grapes', url: grapesDemoUrl },
  { label: 'City', url: cityDemoUrl },
  { label: 'Cake', url: cakeDemoUrl },
  { label: 'Baby', url: babyDemoUrl },
];

type PhotoState = {
  url: string;
  aspectRatio: number;
};

function App() {
  const [photo, setPhoto] = useState<PhotoState | null>(null);
  const [settings, setSettings] = useState<ViewerSettings>(initialSettings);
  const [resetSignal, setResetSignal] = useState(0);
  const headTracking = useHeadTracking();
  const hasPhoto = Boolean(photo);

  const updateSettings = useCallback((nextSettings: Partial<ViewerSettings>) => {
    setSettings((current) => ({ ...current, ...nextSettings }));
  }, []);

  const loadPhoto = useCallback((url: string) => {
    const image = new Image();
    image.onload = () => {
      setPhoto({
        url,
        aspectRatio: image.naturalWidth / image.naturalHeight || 1,
      });
    };
    image.src = url;
  }, []);

  const resetApp = useCallback(() => {
    setSettings(initialSettings);
    headTracking.setEnabled(false);
    setResetSignal((value) => value + 1);
  }, [headTracking]);

  useEffect(() => {
    return () => {
      if (photo?.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
    };
  }, [photo?.url]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark-row">
            <img className="brand-logo" src={logoUrl} alt="" aria-hidden="true" />
            <h1>3Dify</h1>
          </div>
          <p>Turn a flat photo into a subtle 3D photo window.</p>
        </div>

        <section className="controls-bar" aria-label="Controls">
          <div className="action-cluster">
            <ImageUploader demos={demoPhotos} onImageSelected={loadPhoto} />
            <button className="button subtle" type="button" onClick={resetApp} disabled={!hasPhoto}>
              Reset
            </button>
          </div>
          <SettingsPanel
            settings={settings}
            disabled={!hasPhoto}
            onChange={updateSettings}
            webcamEnabled={headTracking.enabled}
            webcamMessage={headTracking.message}
            onWebcamToggle={headTracking.setEnabled}
          />
        </section>
      </header>

      <section className="viewer-wrap" aria-label="3D photo viewer">
        <DepthPhotoViewer
          imageUrl={photo?.url ?? null}
          imageAspectRatio={photo?.aspectRatio ?? 16 / 10}
          settings={settings}
          resetSignal={resetSignal}
          headOffset={headTracking.offset}
          isHeadTrackingActive={headTracking.active}
        />
      </section>

    </main>
  );
}

export default App;
