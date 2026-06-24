export type ViewerSettings = {
  depthAmount: number;
  viewShiftAmount: number;
  zoom: number;
  manualControls: boolean;
};

export type HeadTrackingState = {
  enabled: boolean;
  active: boolean;
  message: string;
  offset: {
    x: number;
    y: number;
    z: number;
  };
};
