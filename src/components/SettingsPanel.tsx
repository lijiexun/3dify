import type { ViewerSettings } from '../types';

type SettingsPanelProps = {
  settings: ViewerSettings;
  disabled: boolean;
  webcamEnabled: boolean;
  webcamMessage: string;
  onChange: (settings: Partial<ViewerSettings>) => void;
  onWebcamToggle: (enabled: boolean) => void;
};

function SettingsPanel({ settings, disabled, webcamEnabled, webcamMessage, onChange, onWebcamToggle }: SettingsPanelProps) {
  const handleManualToggle = (enabled: boolean) => {
    if (disabled) {
      return;
    }

    if (enabled) {
      onWebcamToggle(false);
    }

    onChange({ manualControls: enabled });
  };

  const handleWebcamToggle = (enabled: boolean) => {
    if (disabled) {
      return;
    }

    if (enabled) {
      onChange({ manualControls: false });
    }

    onWebcamToggle(enabled);
  };

  return (
    <div className="settings-strip">
      <Slider
        label="Depth"
        value={settings.depthAmount}
        min={0}
        max={0.28}
        disabled={disabled}
        onChange={(depthAmount) => onChange({ depthAmount })}
      />
      <Slider
        label="View shift"
        value={settings.viewShiftAmount}
        min={0}
        max={0.65}
        disabled={disabled}
        onChange={(viewShiftAmount) => onChange({ viewShiftAmount })}
      />
      <Slider
        label="Zoom"
        value={settings.zoom}
        min={1}
        max={1.24}
        disabled={disabled}
        onChange={(zoom) => onChange({ zoom })}
      />

      <div className="tracking-controls">
        <div className="toggle-group">
          <label className={`toggle-chip ${settings.manualControls ? 'active' : ''}`} title="Manual orbit controls">
            <input
              type="checkbox"
              aria-label="Manual controls"
              checked={settings.manualControls}
              disabled={disabled}
              onChange={(event) => handleManualToggle(event.target.checked)}
            />
            <HandIcon />
            <span>Manual controls</span>
          </label>

          <label className={`toggle-chip eye-toggle ${webcamEnabled ? 'active' : ''}`} title={webcamMessage || 'Eye tracking'}>
            <input
              type="checkbox"
              aria-label="Eye tracking"
              checked={webcamEnabled}
              disabled={disabled}
              onChange={(event) => handleWebcamToggle(event.target.checked)}
            />
            <EyeIcon />
            <span>Eye tracking</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function HandIcon() {
  return (
    <svg className="toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 11.2V5.8a1.25 1.25 0 0 1 2.5 0v5" />
      <path d="M10.5 10.2V4.8a1.25 1.25 0 0 1 2.5 0v5.4" />
      <path d="M13 10.4V6.1a1.2 1.2 0 0 1 2.4 0v5.1" />
      <path d="M15.4 11.3V8.4a1.15 1.15 0 0 1 2.3 0v5.4c0 4.1-2.5 6.2-5.8 6.2h-.6a5.1 5.1 0 0 1-4.1-2.1L4.7 14a1.32 1.32 0 0 1 2.1-1.6l1.2 1.3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.8 12s3.3-5.4 9.2-5.4S21.2 12 21.2 12 17.9 17.4 12 17.4 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step="0.01"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default SettingsPanel;
