import { useCallback, useEffect, useRef, useState } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import type { HeadTrackingState } from '../types';

const offMessage = 'Mouse movement is active.';
const mediapipeVersion = '0.10.35';

type MutableHeadState = Pick<HeadTrackingState, 'active' | 'message' | 'offset'>;

export function useHeadTracking() {
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<MutableHeadState>({
    active: false,
    message: offMessage,
    offset: { x: 0, y: 0, z: 0 },
  });
  const frameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const baselineFaceWidthRef = useRef<number | null>(null);
  const smoothOffsetRef = useRef({ x: 0, y: 0, z: 0 });

  const stopTracking = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    videoRef.current = null;
    baselineFaceWidthRef.current = null;
    smoothOffsetRef.current = { x: 0, y: 0, z: 0 };

    setState({
      active: false,
      message: offMessage,
      offset: { x: 0, y: 0, z: 0 },
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopTracking();
      return;
    }

    let cancelled = false;

    async function startTracking() {
      try {
        setState((current) => ({
          ...current,
          active: false,
          message: 'Starting webcam...',
        }));

        const [{ FaceLandmarker, FilesetResolver }, stream] = await Promise.all([
          import('@mediapipe/tasks-vision'),
          navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false }),
        ]);

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        videoRef.current = video;

        const fileset = await FilesetResolver.forVisionTasks(
          `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${mediapipeVersion}/wasm`,
        );

        landmarkerRef.current = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        setState((current) => ({
          ...current,
          active: true,
          message: 'Eye tracking on.',
        }));

        const tick = () => {
          const currentVideo = videoRef.current;
          const currentLandmarker = landmarkerRef.current;

          if (!currentVideo || !currentLandmarker || cancelled) {
            return;
          }

          const result = currentLandmarker.detectForVideo(currentVideo, performance.now());
          const landmarks = result.faceLandmarks[0];

          if (landmarks?.length) {
            const center = landmarks.reduce(
              (sum, point) => ({ x: sum.x + point.x / landmarks.length, y: sum.y + point.y / landmarks.length }),
              { x: 0, y: 0 },
            );
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const faceWidth = leftEye && rightEye ? Math.abs(rightEye.x - leftEye.x) : 0.18;

            if (!baselineFaceWidthRef.current) {
              baselineFaceWidthRef.current = faceWidth;
            }

            const rawOffset = {
              x: (0.5 - center.x) * 2,
              y: (0.5 - center.y) * 2,
              z: (faceWidth / baselineFaceWidthRef.current - 1) * 0.65,
            };

            smoothOffsetRef.current = {
              x: smoothOffsetRef.current.x + (rawOffset.x - smoothOffsetRef.current.x) * 0.12,
              y: smoothOffsetRef.current.y + (rawOffset.y - smoothOffsetRef.current.y) * 0.12,
              z: smoothOffsetRef.current.z + (rawOffset.z - smoothOffsetRef.current.z) * 0.08,
            };

            setState((current) => ({
              ...current,
              offset: smoothOffsetRef.current,
            }));
          }

          frameRef.current = requestAnimationFrame(tick);
        };

        tick();
      } catch (error) {
        console.warn('Head tracking unavailable', error);
        stopTracking();
        setEnabled(false);
        setState({
          active: false,
          message: 'Webcam unavailable. Mouse movement still works.',
          offset: { x: 0, y: 0, z: 0 },
        });
      }
    }

    startTracking();

    return () => {
      cancelled = true;
      stopTracking();
    };
  }, [enabled, stopTracking]);

  return {
    enabled,
    setEnabled,
    active: state.active,
    message: state.message,
    offset: state.offset,
  };
}
