import { useRef, useEffect, useState, useCallback } from 'react';
import { Video } from 'lucide-react';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useGarmentRenderer } from '@/hooks/useGarmentRenderer';
import { PoseLandmark } from '@/lib/pose';
import { GarmentType } from './GarmentTypeSelector';

interface VirtualMirrorProps {
  isActive: boolean;
  garmentType: GarmentType;
  textureUrl?: string;
}

const VirtualMirror = ({ isActive, garmentType, textureUrl }: VirtualMirrorProps) => {
  const [status, setStatus] = useState('Initializing...');
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWidth = 640;
  const canvasHeight = 480;

  // Handle pose results
  const handlePoseResults = useCallback((landmarks: PoseLandmark[]) => {
    if (garmentRendererRef.current?.updateFromSkeleton) {
      garmentRendererRef.current.updateFromSkeleton(landmarks);
    }
  }, []);

  // Pose detection
  const {
    videoRef,
    canvasRef,
    isLoading: poseLoading,
    error: poseError,
    isActive: cameraActive,
    startCamera,
  } = usePoseDetection({
    onResults: handlePoseResults,
    enabled: isActive,
  });

  // Garment renderer
  const garmentRenderer = useGarmentRenderer({
    garmentType,
    textureUrl,
    canvasWidth,
    canvasHeight,
  });
  
  // Store renderer ref for pose callback
  const garmentRendererRef = useRef(garmentRenderer);
  garmentRendererRef.current = garmentRenderer;

  // Initialize when active
  useEffect(() => {
    if (isActive && containerRef.current) {
      const init = async () => {
        setStatus('Loading 3D Engine...');
        
        // Set the container ref for the renderer
        if (!garmentRenderer.containerRef.current) {
          garmentRenderer.containerRef.current = containerRef.current;
        }
        garmentRenderer.initialize();
        
        setStatus('Ready');
      };
      
      init();
    }
  }, [isActive, garmentRenderer, startCamera, poseLoading]);

  // Start camera as soon as pose model is loaded (no arbitrary timeout)
  useEffect(() => {
    if (!isActive) return;
    if (poseLoading) return;
    if (poseError) return;
    if (cameraActive) return;

    setStatus('Requesting Camera Access...');
    startCamera();
  }, [isActive, poseLoading, poseError, cameraActive, startCamera]);

  // Update status based on state
  useEffect(() => {
    if (poseError) {
      setStatus(`Error: ${poseError}`);
    } else if (poseLoading) {
      setStatus('Loading Pose Model...');
    } else if (cameraActive) {
      setStatus('Virtual Mirror Active');
    }
  }, [poseLoading, poseError, cameraActive]);

  if (!isActive) return null;

  return (
    <div className="relative w-full aspect-[4/3] bg-primary rounded-2xl overflow-hidden shadow-card">
      {/* Hidden video element for camera input */}
      <video
        ref={videoRef}
        className="absolute opacity-0 pointer-events-none"
        playsInline
        muted
      />
      
      {/* Canvas for webcam background */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
      />
      
      {/* Three.js container for garment overlay */}
      <div 
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      />

      {/* Status badge */}
      <div className="absolute top-4 left-4 px-4 py-2 rounded-full bg-primary/80 text-primary-foreground text-xs font-medium backdrop-blur-sm flex items-center gap-2 z-10">
        <div className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-accent animate-pulse' : 'bg-muted-foreground'}`} />
        {status}
      </div>
      
      {/* Powered by badge */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-primary-foreground/60 text-xs z-10">
        Powered by MediaPipe & Three.js
      </div>
    </div>
  );
};

// Placeholder component when mirror is not active
export const VirtualMirrorPlaceholder = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-display font-semibold text-foreground">Virtual Mirror</h3>
    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted/50 border-2 border-dashed border-border">
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 mb-4 rounded-2xl bg-muted flex items-center justify-center">
          <Video className="w-10 h-10 text-muted-foreground" />
        </div>
        <p className="text-foreground font-medium mb-1">Camera Preview</p>
        <p className="text-sm text-muted-foreground">Click "Start Virtual Mirror" to begin</p>
      </div>
    </div>
  </div>
);

export default VirtualMirror;
