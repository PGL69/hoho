import * as THREE from 'three';
import { PoseLandmark, extractSkeleton } from './pose';

export interface SkeletonBone {
  name: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  length: number;
}

export interface Skeleton3D {
  spine: SkeletonBone;
  leftArm: {
    shoulder: SkeletonBone;
    elbow: SkeletonBone;
  };
  rightArm: {
    shoulder: SkeletonBone;
    elbow: SkeletonBone;
  };
  leftLeg: {
    hip: SkeletonBone;
    knee: SkeletonBone;
  };
  rightLeg: {
    hip: SkeletonBone;
    knee: SkeletonBone;
  };
}

// Convert normalized landmark coordinates to 3D space
function landmarkToVector3(
  landmark: PoseLandmark,
  width: number,
  height: number,
  scale: number = 2
): THREE.Vector3 {
  // MediaPipe coordinates: x (0-1 left to right), y (0-1 top to bottom), z (depth)
  // Three.js coordinates: x (left -1 to right 1), y (bottom -1 to top 1), z (toward camera)
  return new THREE.Vector3(
    (landmark.x - 0.5) * scale * (width / height),
    -(landmark.y - 0.5) * scale,
    -landmark.z * scale
  );
}

// Calculate rotation between two points
function getRotationBetweenPoints(from: THREE.Vector3, to: THREE.Vector3): THREE.Euler {
  const direction = new THREE.Vector3().subVectors(to, from).normalize();
  const quaternion = new THREE.Quaternion();
  
  // Create rotation from default down direction to target direction
  const defaultDir = new THREE.Vector3(0, -1, 0);
  quaternion.setFromUnitVectors(defaultDir, direction);
  
  return new THREE.Euler().setFromQuaternion(quaternion);
}

export function createSkeleton3D(
  landmarks: PoseLandmark[],
  canvasWidth: number,
  canvasHeight: number
): Skeleton3D {
  const skeleton = extractSkeleton(landmarks);
  const scale = 2;

  // Convert landmarks to 3D vectors
  const leftShoulderPos = landmarkToVector3(skeleton.shoulders.left, canvasWidth, canvasHeight, scale);
  const rightShoulderPos = landmarkToVector3(skeleton.shoulders.right, canvasWidth, canvasHeight, scale);
  const leftHipPos = landmarkToVector3(skeleton.hips.left, canvasWidth, canvasHeight, scale);
  const rightHipPos = landmarkToVector3(skeleton.hips.right, canvasWidth, canvasHeight, scale);
  const leftElbowPos = landmarkToVector3(skeleton.elbows.left, canvasWidth, canvasHeight, scale);
  const rightElbowPos = landmarkToVector3(skeleton.elbows.right, canvasWidth, canvasHeight, scale);
  const leftWristPos = landmarkToVector3(skeleton.wrists.left, canvasWidth, canvasHeight, scale);
  const rightWristPos = landmarkToVector3(skeleton.wrists.right, canvasWidth, canvasHeight, scale);
  const leftKneePos = landmarkToVector3(skeleton.knees.left, canvasWidth, canvasHeight, scale);
  const rightKneePos = landmarkToVector3(skeleton.knees.right, canvasWidth, canvasHeight, scale);
  const leftAnklePos = landmarkToVector3(skeleton.ankles.left, canvasWidth, canvasHeight, scale);
  const rightAnklePos = landmarkToVector3(skeleton.ankles.right, canvasWidth, canvasHeight, scale);

  const shoulderCenter = new THREE.Vector3().addVectors(leftShoulderPos, rightShoulderPos).multiplyScalar(0.5);
  const hipCenter = new THREE.Vector3().addVectors(leftHipPos, rightHipPos).multiplyScalar(0.5);

  return {
    spine: {
      name: 'spine',
      position: shoulderCenter,
      rotation: getRotationBetweenPoints(shoulderCenter, hipCenter),
      length: shoulderCenter.distanceTo(hipCenter),
    },
    leftArm: {
      shoulder: {
        name: 'leftShoulder',
        position: leftShoulderPos,
        rotation: getRotationBetweenPoints(leftShoulderPos, leftElbowPos),
        length: leftShoulderPos.distanceTo(leftElbowPos),
      },
      elbow: {
        name: 'leftElbow',
        position: leftElbowPos,
        rotation: getRotationBetweenPoints(leftElbowPos, leftWristPos),
        length: leftElbowPos.distanceTo(leftWristPos),
      },
    },
    rightArm: {
      shoulder: {
        name: 'rightShoulder',
        position: rightShoulderPos,
        rotation: getRotationBetweenPoints(rightShoulderPos, rightElbowPos),
        length: rightShoulderPos.distanceTo(rightElbowPos),
      },
      elbow: {
        name: 'rightElbow',
        position: rightElbowPos,
        rotation: getRotationBetweenPoints(rightElbowPos, rightWristPos),
        length: rightElbowPos.distanceTo(rightWristPos),
      },
    },
    leftLeg: {
      hip: {
        name: 'leftHip',
        position: leftHipPos,
        rotation: getRotationBetweenPoints(leftHipPos, leftKneePos),
        length: leftHipPos.distanceTo(leftKneePos),
      },
      knee: {
        name: 'leftKnee',
        position: leftKneePos,
        rotation: getRotationBetweenPoints(leftKneePos, leftAnklePos),
        length: leftKneePos.distanceTo(leftAnklePos),
      },
    },
    rightLeg: {
      hip: {
        name: 'rightHip',
        position: rightHipPos,
        rotation: getRotationBetweenPoints(rightHipPos, rightKneePos),
        length: rightHipPos.distanceTo(rightKneePos),
      },
      knee: {
        name: 'rightKnee',
        position: rightKneePos,
        rotation: getRotationBetweenPoints(rightKneePos, rightAnklePos),
        length: rightKneePos.distanceTo(rightAnklePos),
      },
    },
  };
}
