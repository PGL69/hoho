import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { createGarmentGeometry, SimpleClothPhysics } from '@/lib/garment';
import { createSkeleton3D, Skeleton3D } from '@/lib/skeleton';
import { PoseLandmark } from '@/lib/pose';
import { GarmentType } from '@/components/dressing-room/GarmentTypeSelector';

interface UseGarmentRendererOptions {
  garmentType: GarmentType;
  textureUrl?: string;
  canvasWidth: number;
  canvasHeight: number;
}

export function useGarmentRenderer({
  garmentType,
  textureUrl,
  canvasWidth,
  canvasHeight,
}: UseGarmentRendererOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const garmentMeshRef = useRef<THREE.Mesh | null>(null);
  const physicsRef = useRef<SimpleClothPhysics | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Three.js scene
  const initialize = useCallback(() => {
    if (!containerRef.current || isInitialized) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background
    sceneRef.current = scene;

    // Create orthographic camera (2D-like projection)
    const aspect = canvasWidth / canvasHeight;
    const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 100);
    camera.position.z = 2;
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 2);
    scene.add(directionalLight);

    // Create garment
    createGarment();

    setIsInitialized(true);

    // Start animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Update physics
      if (physicsRef.current && garmentMeshRef.current) {
        physicsRef.current.update();
        physicsRef.current.applyToGeometry(garmentMeshRef.current.geometry);
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
  }, [canvasWidth, canvasHeight, isInitialized]);

  // Create garment mesh
  const createGarment = useCallback(() => {
    if (!sceneRef.current) return;

    // Remove existing garment
    if (garmentMeshRef.current) {
      sceneRef.current.remove(garmentMeshRef.current);
      garmentMeshRef.current.geometry.dispose();
      if (garmentMeshRef.current.material instanceof THREE.Material) {
        garmentMeshRef.current.material.dispose();
      }
    }

    // Create geometry
    const geometry = createGarmentGeometry(garmentType);
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });

    // Apply texture if available
    if (textureRef.current) {
      material.map = textureRef.current;
      material.color.set(0xffffff);
      material.needsUpdate = true;
    }

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 1;
    sceneRef.current.add(mesh);
    garmentMeshRef.current = mesh;

    // Initialize physics
    physicsRef.current = new SimpleClothPhysics(geometry);
  }, [garmentType]);

  // Load texture from URL
  const loadTexture = useCallback((url: string) => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    
    loader.load(
      url,
      (texture) => {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        textureRef.current = texture;
        
        if (garmentMeshRef.current) {
          const material = garmentMeshRef.current.material as THREE.MeshStandardMaterial;
          material.map = texture;
          material.color.set(0xffffff);
          material.needsUpdate = true;
        }
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
      }
    );
  }, []);

  // Update garment position based on skeleton
  const updateFromSkeleton = useCallback((landmarks: PoseLandmark[]) => {
    if (!garmentMeshRef.current || !physicsRef.current) return;

    const skeleton = createSkeleton3D(landmarks, canvasWidth, canvasHeight);
    
    // Position garment based on skeleton with proper coverage
    if (garmentType === 'shirt') {
      // Calculate torso center between shoulders and hips
      const shoulderCenter = skeleton.spine.position.clone();
      const hipCenter = new THREE.Vector3()
        .addVectors(skeleton.leftLeg.hip.position, skeleton.rightLeg.hip.position)
        .multiplyScalar(0.5);
      
      // Position at the center of the torso
      const torsoCenter = new THREE.Vector3()
        .addVectors(shoulderCenter, hipCenter)
        .multiplyScalar(0.5);
      
      garmentMeshRef.current.position.copy(torsoCenter);
      garmentMeshRef.current.position.z = 0.1; // Slightly in front
      
      // Scale based on shoulder width and torso height
      const shoulderDist = skeleton.leftArm.shoulder.position.distanceTo(skeleton.rightArm.shoulder.position);
      const torsoHeight = shoulderCenter.distanceTo(hipCenter);

      // Nudge slightly down so the shirt covers more of the torso by default
      garmentMeshRef.current.position.y -= torsoHeight * 0.08;
      
      // Use shoulder width for X scale and torso height for Y scale
      const scaleX = shoulderDist * 1.55; // more generous shoulder coverage
      const scaleY = torsoHeight * 1.55;  // cover full torso (incl. abdomen)
      garmentMeshRef.current.scale.set(scaleX, scaleY, 1);
      
    } else if (garmentType === 'pants') {
      // Position at hip center
      const hipCenter = new THREE.Vector3()
        .addVectors(skeleton.leftLeg.hip.position, skeleton.rightLeg.hip.position)
        .multiplyScalar(0.5);
      
      // We only model hips/knees in our Skeleton3D right now, so estimate full leg length
      // by doubling hip->knee (stable + better than the previous knee->knee bug).
      const leftThigh = skeleton.leftLeg.hip.position.distanceTo(skeleton.leftLeg.knee.position);
      const rightThigh = skeleton.rightLeg.hip.position.distanceTo(skeleton.rightLeg.knee.position);
      const legLength = Math.max(leftThigh, rightThigh) * 2;
      
      garmentMeshRef.current.position.copy(hipCenter);
      garmentMeshRef.current.position.y -= 0.12; // Slightly below hips
      garmentMeshRef.current.position.z = 0.1;
      
      // Scale based on hip width and leg proportions
      const hipDist = skeleton.leftLeg.hip.position.distanceTo(skeleton.rightLeg.hip.position);
      const scaleX = hipDist * 2.0;
      const scaleY = legLength * 1.25;
      garmentMeshRef.current.scale.set(scaleX, scaleY, 1);
      
    } else if (garmentType === 'skirt') {
      // Position at hip level
      const hipCenter = new THREE.Vector3()
        .addVectors(skeleton.leftLeg.hip.position, skeleton.rightLeg.hip.position)
        .multiplyScalar(0.5);
      
      garmentMeshRef.current.position.copy(hipCenter);
      garmentMeshRef.current.position.z = 0.1;
      
      // Scale based on hip width
      const hipDist = skeleton.leftLeg.hip.position.distanceTo(skeleton.rightLeg.hip.position);
      const scale = hipDist * 1.6;
      garmentMeshRef.current.scale.set(scale, scale, 1);
    }

    // Pin top vertices of garment to skeleton points for physics
    const gridWidth = garmentType === 'shirt' ? 13 : (garmentType === 'pants' ? 7 : 15);
    const vertexCount = physicsRef.current.getVertexCount();
    
    // Pin top row of vertices to shoulders/hips
    for (let i = 0; i < Math.min(gridWidth, vertexCount); i++) {
      const t = i / (gridWidth - 1);
      const pinPosition = garmentMeshRef.current.position.clone();
      
      if (garmentType === 'shirt') {
        // Interpolate along shoulder line
        pinPosition.x = skeleton.leftArm.shoulder.position.x * (1 - t) + 
                       skeleton.rightArm.shoulder.position.x * t;
        pinPosition.y = skeleton.spine.position.y + 0.1;
      } else {
        // Interpolate along hip line
        pinPosition.x = skeleton.leftLeg.hip.position.x * (1 - t) + 
                       skeleton.rightLeg.hip.position.x * t;
        pinPosition.y = skeleton.leftLeg.hip.position.y;
      }
      
      physicsRef.current.pinVertex(i, pinPosition);
    }
  }, [garmentType, canvasWidth, canvasHeight]);

  // Effect to update texture when URL changes
  useEffect(() => {
    if (textureUrl && isInitialized) {
      loadTexture(textureUrl);
    }
  }, [textureUrl, isInitialized, loadTexture]);

  // Effect to recreate garment when type changes
  useEffect(() => {
    if (isInitialized) {
      createGarment();
    }
  }, [garmentType, isInitialized, createGarment]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, []);

  return {
    containerRef,
    initialize,
    updateFromSkeleton,
    isInitialized,
  };
}
