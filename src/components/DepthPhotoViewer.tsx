import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { estimateDepthWithAi } from '../utils/aiDepth';
import { createFallbackDepthMap, prepareDepthForRendering, sampleDepth, type DepthMap } from '../utils/depthMap';
import { createTextureFromImage, loadImageElement } from '../utils/imageTexture';
import { useMouseParallax } from '../hooks/useMouseParallax';
import type { ViewerSettings } from '../types';

type DepthPhotoViewerProps = {
  imageUrl: string | null;
  imageAspectRatio: number;
  settings: ViewerSettings;
  resetSignal: number;
  headOffset: { x: number; y: number; z: number };
  isHeadTrackingActive: boolean;
};

function displaceGeometry(geometry: THREE.PlaneGeometry, depthMap: DepthMap, depthAmount: number) {
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const uv = geometry.attributes.uv as THREE.BufferAttribute;

  for (let index = 0; index < position.count; index += 1) {
    const depth = sampleDepth(depthMap, uv.getX(index), uv.getY(index));
    position.setZ(index, (depth - 0.48) * depthAmount);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function disposeMesh(mesh: THREE.Mesh) {
  mesh.geometry.dispose();

  if (mesh.material instanceof THREE.MeshBasicMaterial) {
    mesh.material.map?.dispose();
    mesh.material.dispose();
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('Depth model timed out.')), timeoutMs);
    }),
  ]);
}

function DepthPhotoViewer({
  imageUrl,
  imageAspectRatio,
  settings,
  resetSignal,
  headOffset,
  isHeadTrackingActive,
}: DepthPhotoViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rawDepthRef = useRef<DepthMap | null>(null);
  const renderDepthRef = useRef<DepthMap | null>(null);
  const targetCameraRef = useRef(new THREE.Vector3(0, 0, 2.35));
  const currentCameraRef = useRef(new THREE.Vector3(0, 0, 2.35));
  const depthAmountRef = useRef(settings.depthAmount);
  const zoomRef = useRef(settings.zoom);
  const mouseParallax = useMouseParallax();

  const applyCurrentDepth = useCallback(() => {
    const rawDepth = rawDepthRef.current;
    const mesh = meshRef.current;

    if (!rawDepth || !mesh) {
      return;
    }

    const renderDepth = prepareDepthForRendering(rawDepth);
    renderDepthRef.current = renderDepth;
    displaceGeometry(mesh.geometry as THREE.PlaneGeometry, renderDepth, settings.depthAmount);
  }, [settings.depthAmount]);

  useEffect(() => {
    depthAmountRef.current = settings.depthAmount;
  }, [settings.depthAmount]);

  useEffect(() => {
    zoomRef.current = settings.zoom;
  }, [settings.zoom]);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return;
    }

    const mountElement: HTMLDivElement = mount;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0c0e');
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.copy(currentCameraRef.current);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountElement.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enabled = false;
    controls.enablePan = false;
    controls.minDistance = 1.8;
    controls.maxDistance = 3.4;

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    function resize() {
      const width = mountElement.clientWidth;
      const height = mountElement.clientHeight;
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mountElement);
    resize();

    let frameId = 0;

    function animate() {
      if (!cameraRef.current || !rendererRef.current || !sceneRef.current) {
        return;
      }

      if (!controlsRef.current?.enabled) {
        currentCameraRef.current.lerp(targetCameraRef.current, 0.07);
        cameraRef.current.position.copy(currentCameraRef.current);
        cameraRef.current.lookAt(0, 0, 0);
      }

      controlsRef.current?.update();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      frameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = settings.manualControls;
    }
  }, [settings.manualControls]);

  useEffect(() => {
    const sourceOffset = isHeadTrackingActive ? headOffset : mouseParallax.offset;
    const strength = settings.viewShiftAmount;
    targetCameraRef.current.set(
      sourceOffset.x * strength,
      sourceOffset.y * strength * 0.58,
      2.35 - (isHeadTrackingActive ? headOffset.z * 0.16 : 0),
    );
  }, [headOffset, isHeadTrackingActive, mouseParallax.offset, settings.viewShiftAmount]);

  useEffect(() => {
    currentCameraRef.current.set(0, 0, 2.35);
    targetCameraRef.current.set(0, 0, 2.35);
    cameraRef.current?.position.set(0, 0, 2.35);
    controlsRef.current?.reset();
  }, [resetSignal]);

  useEffect(() => {
    let cancelled = false;

    async function updatePhoto() {
      const scene = sceneRef.current;

      if (!scene || !imageUrl) {
        return;
      }

      const image = await loadImageElement(imageUrl);

      if (cancelled) {
        return;
      }

      const fallbackDepthMap = createFallbackDepthMap(image);
      const renderDepth = prepareDepthForRendering(fallbackDepthMap);
      const texture = createTextureFromImage(image);
      const aspect = image.naturalWidth / image.naturalHeight;
      const visibleAspect = imageAspectRatio;
      const fillScale = Math.max(visibleAspect / aspect, aspect / visibleAspect, 1);
      const planeHeight = 1.18 * fillScale * zoomRef.current;
      const planeWidth = planeHeight * aspect;
      const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 116, 116);
      displaceGeometry(geometry, renderDepth, depthAmountRef.current);
      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);

      if (meshRef.current) {
        scene.remove(meshRef.current);
        disposeMesh(meshRef.current);
      }

      rawDepthRef.current = fallbackDepthMap;
      renderDepthRef.current = renderDepth;
      meshRef.current = mesh;
      scene.add(mesh);

      const aiDepthMap = await withTimeout(estimateDepthWithAi(image.currentSrc || image.src), 14000).catch(() => null);

      if (cancelled || !aiDepthMap || meshRef.current !== mesh) {
        return;
      }

      rawDepthRef.current = aiDepthMap;
      const aiRenderDepth = prepareDepthForRendering(aiDepthMap);
      renderDepthRef.current = aiRenderDepth;
      displaceGeometry(mesh.geometry as THREE.PlaneGeometry, aiRenderDepth, depthAmountRef.current);
    }

    updatePhoto().catch((error) => console.warn('Could not load photo', error));

    return () => {
      cancelled = true;
    };
  }, [imageAspectRatio, imageUrl]);

  useEffect(() => {
    applyCurrentDepth();
  }, [applyCurrentDepth]);

  useEffect(() => {
    const mesh = meshRef.current;

    if (!mesh || !imageUrl) {
      return;
    }

    const visibleAspect = imageAspectRatio;
    const texture = mesh.material instanceof THREE.MeshBasicMaterial ? mesh.material.map : null;
    const image = texture?.image as HTMLImageElement | undefined;

    if (!image?.naturalWidth || !image?.naturalHeight) {
      return;
    }

    const aspect = image.naturalWidth / image.naturalHeight;
    const fillScale = Math.max(visibleAspect / aspect, aspect / visibleAspect, 1);
    const planeHeight = 1.18 * fillScale * settings.zoom;
    const planeWidth = planeHeight * aspect;
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 116, 116);
    const depth = renderDepthRef.current ?? rawDepthRef.current;

    if (depth) {
      displaceGeometry(geometry, depth, settings.depthAmount);
    }

    mesh.geometry.dispose();
    mesh.geometry = geometry;
  }, [imageAspectRatio, imageUrl, settings.depthAmount, settings.zoom]);

  const frameAspect = Math.max(0.62, Math.min(2.2, imageAspectRatio || 16 / 10));

  return (
    <div className="window-frame" style={{ '--frame-aspect': frameAspect } as CSSProperties} {...mouseParallax.bind}>
      <div ref={mountRef} className="three-mount" />
      {!imageUrl && (
        <div className="empty-state">
          <div className="portal-mark" aria-hidden="true" />
          <h2>Open a photo</h2>
          <p>Then move your view to reveal its hidden depth.</p>
        </div>
      )}
    </div>
  );
}

export default DepthPhotoViewer;
