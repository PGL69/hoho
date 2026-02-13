import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { PoseLandmark, isPoseValid } from '@/lib/pose';

interface UsePoseDetectionOptions {
  onResults: (landmarks: PoseLandmark[]) => void;
  enabled?: boolean;
}

export function usePoseDetection({ onResults, enabled = true }: UsePoseDetectionOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<Camera | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const initializePose = useCallback(async () => {
    if (!enabled || poseRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // MediaPipe packages sometimes expose different ESM/CJS shapes under bundlers.
      // Dynamically resolve a constructor to avoid "Pose is not a constructor".
      const mp = await import('@mediapipe/pose');
      const PoseCtor =
        (mp as any).Pose ??
        (mp as any).default?.Pose ??
        (mp as any).default;

      if (typeof PoseCtor !== 'function') {
        throw new Error('MediaPipe Pose constructor not found (module shape mismatch)');
      }

      // Create MediaPipe Pose instance
      const pose = new PoseCtor({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        },
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results: any) => {
        if (results?.poseLandmarks && isPoseValid(results.poseLandmarks as PoseLandmark[])) {
          onResults(results.poseLandmarks as PoseLandmark[]);
        }
        
        // Draw video frame to canvas for background
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
           ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

          }
        }
      });

      poseRef.current = pose;
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize MediaPipe Pose:', err);
      setError('Failed to load pose detection model');
      setIsLoading(false);
    }
  }, [enabled, onResults]);

  const startCamera = useCallback(async () => {
    if (!poseRef.current || !videoRef.current) {
      console.error('Pose or video ref not ready');
      return;
    }

    try {
      // First request camera permission explicitly
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      
      // Attach stream to video element
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      
      console.log('Camera access granted, starting pose detection...');
      
      // Now start the MediaPipe camera loop
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;
      setIsActive(true);
      console.log('Pose detection started successfully');
    } catch (err) {
      console.error('Failed to start camera:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permissions in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera. Please allow camera permissions.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      initializePose();
    }

    return () => {
      stopCamera();
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
    };
  }, [enabled, initializePose, stopCamera]);

  return {
    videoRef,
    canvasRef,
    isLoading,
    error,
    isActive,
    startCamera,
    stopCamera,
  };
}
