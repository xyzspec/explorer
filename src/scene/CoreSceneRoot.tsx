import { GalleryPager, markFeedHintSeen } from '../gallery/GalleryPager';
import { t, useLocale } from '../i18n';
import { useGallerySwipe } from '../gallery/useGallerySwipe';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { initialQuality, QUALITY } from '../performance/renderQuality';
import type { AssetStatus } from '../performance/ModelAssetStore';
import { RendererBoundary } from './RendererBoundary';
import { readSafeRendering, rememberSafeRendering } from '../performance/renderBudget';
import type { PreparationStatus } from '../performance/ModelRuntime';
import { ModelRuntime, PERFORMANCE_CANVAS } from '../performance/ModelRuntime';
import { Canvas } from '@react-three/fiber';
import type { SpatialDocument } from '../model/SpatialDocument';
import { dimensionsFromNodes } from '../model/room';
import { XyzCornerGrid } from './XyzCornerGrid';
import { Lighting, lightNodes } from './Lighting';
import { LightSourceMarker } from './LightSourceMarker';
import { SpatialScene } from './SpatialScene';
import { nodesForRoomSizing } from './roomSizing';
import { cameraClipPlanes, cameraSceneScale } from './cameraScale';
import { ViewPointControls } from './ViewPointControls';
import { ViewPointMarker } from './ViewPointMarker';
import { useMobileViewport } from '../ui/useMobileViewport';
import { useViewPointTour } from './useViewPointTour';
import { viewPoints } from './viewPoints';
import type { OrbitControls as OrbitControlType } from 'three-stdlib';
import type { PerspectiveCamera as ThreePerspectiveCamera, WebGLRenderer } from 'three';
import { cameraNodeForSelection } from './cameraSelection';
import { CameraClipController } from './CameraClipController';
import { EditorSelectionControls } from './EditorSelectionControls';
import { SelectionBounds } from './SelectionBounds';
import type { AxisName } from '../xyzdsl/types';
import type { LinearStepChoice, RotationStep } from '../ui/SelectedNodeInspector';

interface SceneRootProps {
  initialViewPoint?: number;
  onViewPointChange?: (index: number) => void;
  galleryCanPrevious?: boolean;
  galleryCanNext?: boolean;
  forceTour?: boolean;
  galleryOverlay?: ReactNode;
  onTraverseGallery?: (delta: number) => void;
  document: SpatialDocument;
  selectedNodeId?: string;
  onSelectNode?: (id: string | undefined) => void;
  editorMode: boolean;
  selectedNodeCanEdit: boolean;
  editorLinearStep: number;
  editorRotationStep: RotationStep;
  linearStepChoice: LinearStepChoice;
  onLinearStepChoiceChange: (choice: LinearStepChoice) => void;
  onRotationStepChange: (step: RotationStep) => void;
  onMoveNode: (axis: AxisName, delta: number) => void;
  onResizeNode: (axis: AxisName, delta: number) => void;
  onRotateNode: (axis: AxisName, delta: number) => void;
  onCreateNode: (position: [number, number, number]) => void;
}

const DEFAULT_ORBIT_TARGET: [number, number, number] = [0.6, 0.5, 0.4];
const DEFAULT_CAMERA_POSITION: [number, number, number] = [1.4, 1.1, 1.8];

export function SceneRoot({ initialViewPoint = 0, onViewPointChange, galleryCanPrevious = true, galleryCanNext = true, forceTour = false, galleryOverlay, onTraverseGallery, document: spatialDocument, selectedNodeId, onSelectNode, editorMode, selectedNodeCanEdit, editorLinearStep, editorRotationStep, linearStepChoice, onLinearStepChoiceChange, onRotationStepChange, onMoveNode, onResizeNode, onRotateNode, onCreateNode }: SceneRootProps) {
  useLocale();
  const gallery = Boolean(galleryOverlay);
  const [looking, setLooking] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const exitLooking = useCallback(() => setLooking(false), []);
  const dismissHint = useCallback(() => { setInteracted(true); markFeedHintSeen(); }, []);
  const [quality] = useState(initialQuality);
  const [safe, setSafe] = useState(readSafeRendering);
  const [rendererGeneration, setRendererGeneration] = useState(0);
  const [preparation, setPreparation] = useState<PreparationStatus>('loading');
  const [modelRetry, setModelRetry] = useState(0);
  const retryRenderer = () => {
    rememberSafeRendering(); setSafe(true); setPreparation('loading'); setRendererGeneration(value => value + 1);
  };
  const onPreparation = useCallback((status: PreparationStatus) => {
    setPreparation(status);
    if (status === 'context-lost') setSafe(true);
  }, []);
  const mobile = useMobileViewport();
  const [assetStatus, setAssetStatus] = useState<AssetStatus>();
  const cameraSizingNodes = useMemo(() => nodesForRoomSizing(spatialDocument), [spatialDocument]);
  const roomDimensions = dimensionsFromNodes(cameraSizingNodes);
  const [modelPrecisionScales, setModelPrecisionScales] = useState<Record<string, number>>({});
  const handleModelPrecisionScaleChange = useCallback((id: string, scale: number | undefined) => {
    setModelPrecisionScales((current) => {
      if (scale === undefined) {
        if (!(id in current)) return current;
        const next = { ...current };
        delete next[id];
        return next;
      }
      if (current[id] === scale) return current;
      return { ...current, [id]: scale };
    });
  }, []);
  const selectedNode = useMemo(
    () => {
      const node = cameraNodeForSelection(spatialDocument, selectedNodeId);
      const precisionScale = node && modelPrecisionScales[node.id];
      return node && precisionScale ? {
        ...node,
        metadata: { ...node.metadata, cameraPrecisionScale: precisionScale },
      } : node;
    },
    [modelPrecisionScales, selectedNodeId, spatialDocument],
  );
  const lights = useMemo(() => lightNodes(spatialDocument), [spatialDocument]);
  const points = useMemo(() => viewPoints(spatialDocument), [spatialDocument]);
  const orbitRef = useRef<OrbitControlType>(null);
  const tour = useViewPointTour(spatialDocument, points.length, mobile, editorMode, forceTour || Boolean(onTraverseGallery), initialViewPoint, onViewPointChange);
  const pointIndex = tour.index;
  const point = pointIndex === undefined ? undefined : points[pointIndex];
  const selectPoint = useCallback((index: number) => { dismissHint(); tour.select(index); }, [dismissHint, tour.select]);
  const gallerySwipe = useGallerySwipe(onTraverseGallery, gallery && points.length > 1 ? tour.traverse : undefined, gallery && !looking,
    (axis, delta) => axis === 'y' ? (delta > 0 ? galleryCanNext : galleryCanPrevious) : pointIndex !== undefined && pointIndex + delta >= 0 && pointIndex + delta < points.length, dismissHint);
  const cameraMode = point ? 'pov' : 'orbit';
  // A thin editor selection must not carry its tiny near plane into a room tour:
  // it loses depth precision and makes closely spaced model surfaces z-fight.
  const sceneScale = cameraSceneScale(cameraSizingNodes, point ? undefined : selectedNode, DEFAULT_CAMERA_POSITION);
  const selectionBounds = point ? undefined : selectedNode?.bounds;
  const clips = cameraClipPlanes(sceneScale, cameraSizingNodes, DEFAULT_CAMERA_POSITION, selectionBounds);
  const orbitTarget = useMemo(() => {
    return selectedNode?.transform.position ?? DEFAULT_ORBIT_TARGET;
  }, [selectedNode]);

  const invalidateRef = useRef<() => void>(() => {});
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const diagnostics = import.meta.env.DEV && new URLSearchParams(location.search).has('renderDiagnostics');
  const cameraRef = useRef<ThreePerspectiveCamera>(null);

  return (
    <div className={`scene-viewport${gallery ? " gallery-feed" : ""}`} {...gallerySwipe.handlers}>
    {galleryOverlay}
    <div className="gallery-scene-motion" style={gallery ? gallerySwipe.style : undefined}>
    <RendererBoundary key={rendererGeneration} onRetry={retryRenderer}>
    <Canvas
      className="scene-canvas"
      {...PERFORMANCE_CANVAS}
      shadows={!safe}
      gl={{ antialias: quality !== 'low' && !safe }}
      dpr={[1, safe ? 1 : QUALITY[quality].dpr]}
      fallback={<div className="scene-preparation" role="alert">{t("This browser could not start WebGL. Try another browser or device.")}</div>}
      onCreated={({ invalidate, gl }) => { invalidateRef.current = invalidate; rendererRef.current = gl; }}
      onPointerMissed={() => {
        if (cameraMode === 'orbit') onSelectNode?.(undefined);
      }}
    >
      <ModelRuntime onPreparation={onPreparation} retry={modelRetry} onStatus={import.meta.env.DEV ? setAssetStatus : undefined}>
      <color attach="background" args={['#151820']} />
      <PerspectiveCamera ref={cameraRef} makeDefault position={DEFAULT_CAMERA_POSITION} fov={45} near={clips.near} far={clips.far} />
      <Lighting document={spatialDocument} />
      {editorMode && <XyzCornerGrid {...roomDimensions} />}
      <SpatialScene document={spatialDocument} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} selectionEnabled={cameraMode === 'orbit'} tourMode={Boolean(point)} maxTier={point && quality !== 'low' ? 'detail' : QUALITY[quality].maxTier} onPrecisionScaleChange={handleModelPrecisionScaleChange}/>
      {editorMode && !point && points.map(node => (
        <ViewPointMarker key={node.id} node={node} selected={node.id === selectedNodeId} onSelect={onSelectNode} />
      ))}
      {editorMode && !point && lights.map(node => (
        <LightSourceMarker key={node.id} node={node} selected={node.id === selectedNodeId} onSelect={onSelectNode} />
      ))}
      {selectedNode && !point && (editorMode || (!selectedNode.metadata?.viewPoint && !selectedNode.light)) ? <SelectionBounds node={selectedNode} /> : null}
      {cameraMode === 'orbit' ? <OrbitControls enabled={!gallery || looking} ref={orbitRef} makeDefault target={orbitTarget} maxPolarAngle={Math.PI} /> : null}
      <ViewPointControls lookEnabled={!gallery || looking} galleryMode={gallery} onTraverseDocument={!looking ? onTraverseGallery : undefined} point={point} orbitTarget={tour.orbitTarget} onTraverse={tour.traverse} onExit={gallery && looking ? exitLooking : tour.exit} />
      <CameraClipController nodes={cameraSizingNodes} scale={sceneScale} selectionBounds={selectionBounds} />
      <EditorSelectionControls
        active={editorMode && cameraMode === 'orbit'}
        canEditSelection={Boolean(selectedNodeId && selectedNodeCanEdit)}
        linearStep={editorLinearStep}
        rotationStep={editorRotationStep}
        linearStepChoice={linearStepChoice}
        onLinearStepChoiceChange={onLinearStepChoiceChange}
        onRotationStepChange={onRotationStepChange}
        onMove={onMoveNode}
        onResize={onResizeNode}
        onRotate={onRotateNode}
        onCreate={onCreateNode}
      />
      </ModelRuntime>
    </Canvas>
    {(preparation === 'error' || preparation === 'context-lost') && <div className={preparation === 'error' ? 'scene-model-error' : 'scene-preparation'} role={preparation === 'error' ? 'alert' : 'status'} aria-live="polite" data-model-preparation={preparation === 'context-lost' ? preparation : undefined} data-model-error={preparation === 'error' ? true : undefined}>
      <span>{preparation === 'context-lost' ? t("Graphics were interrupted. Recovering with reduced graphics…") : t("Some models could not be loaded. You can keep exploring or retry.")}</span>
      {import.meta.env.DEV && preparation === 'error' && assetStatus?.errors.map(error => <small key={error}>{error}</small>)}
      {preparation === 'error' && <button onClick={() => setModelRetry(value => value + 1)}>{t("Retry models")}</button>}
      {preparation === 'context-lost' && <button onClick={retryRenderer}>{t("Restart viewer")}</button>}
    </div>}
    </RendererBoundary>
    </div>
    {diagnostics && <button style={{ position: 'absolute', bottom: 100, left: 12, zIndex: 30 }} onClick={() => {
      const extension = rendererRef.current?.getContext().getExtension('WEBGL_lose_context');
      if (!extension) return;
      extension.loseContext();
      setTimeout(() => extension.restoreContext(), 1000);
    }}>{t("Test graphics recovery")}</button>}
    {gallery ? <GalleryPager points={points} index={pointIndex} looking={looking} onLookingChange={value => { dismissHint(); setLooking(value); }} onSelect={selectPoint} canHint={Boolean(onTraverseGallery) && galleryCanNext} ready={preparation === 'ready' || preparation === 'error'} interacted={interacted} /> : mobile ? point && points.length > 1 && (
      <nav className="view-point-overlays" aria-label={t("View point traversal")}>
        <span className="view-point-status" role="status">{t("View point")} {(pointIndex ?? 0) + 1} {t("of")} {points.length}</span>
        <button type="button" aria-label={t("Previous view point")} onClick={() => tour.traverse(-1)}>‹</button>
        <button type="button" aria-label={t("Next view point")} onClick={() => tour.traverse(1)}>›</button>
      </nav>
    ) : (
    <section className={`camera-controls camera-controls--${cameraMode}`} aria-label={t("Camera navigation")}>
      {import.meta.env.DEV && assetStatus && <small aria-label={t("Model resource usage")}>{assetStatus.ready}/{assetStatus.total} {t("models ·")} {(assetStatus.bytes / 1048576).toFixed(1)} {t("MiB estimated ·")} {assetStatus.loading} {t("loading")}</small>}
      {point ? <>
        <div role="group" aria-label={t("View point traversal")}>
          <button type="button" disabled={points.length < 2} onClick={() => tour.traverse(-1)}>{t("Previous")}</button>
          <span role="status">{t("View point")} {(pointIndex ?? 0) + 1} / {points.length}</span>
          <button type="button" disabled={points.length < 2} onClick={() => tour.traverse(1)}>{t("Next")}</button>
          {tour.exit && <button type="button" onClick={tour.exit}>{t("Exit tour")}</button>}
        </div>
        <p>{t("Drag to look around · Previous/Next to traverse · ↑/↓ previous/next")}{tour.exit ? t(" · Esc exit.") : onTraverseGallery ? t(" · Swipe from the top/bottom edge to change gallery documents.") : ''}</p>
      </> : <>
        {points.length > 0 && <button type="button" onClick={() => tour.start(orbitRef.current?.target.toArray() as [number, number, number] | undefined)}>{t("Start tour ·")} {points.length} {t("view points")}</button>}
        <p>{editorMode ? t("Ctrl/Cmd + wheel rotate \u00b7 +/\u2212 resize all \u00b7 X/Y/Z resize axis \u00b7 Shift decreases \u00b7 [ step fine/coarse \u00b7 ] angle fine/coarse \u00b7") + " " : ''}{t("Cmd/Ctrl + click to select")}</p>
      </>}
    </section>
    )}
    </div>
  );
}
