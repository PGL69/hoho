import * as THREE from 'three';
import { Skeleton3D } from './skeleton';
import { GarmentType } from '@/components/dressing-room/GarmentTypeSelector';

// Simple cloth vertex for physics simulation
interface ClothVertex {
  position: THREE.Vector3;
  previousPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  pinned: boolean;
  mass: number;
}

// Simple spring constraint
interface SpringConstraint {
  vertexA: number;
  vertexB: number;
  restLength: number;
  stiffness: number;
}

export class SimpleClothPhysics {
  private vertices: ClothVertex[] = [];
  private constraints: SpringConstraint[] = [];
  private gravity = new THREE.Vector3(0, -0.0005, 0);
  private damping = 0.98;
  private maxStretch = 1.1;

  constructor(geometry: THREE.BufferGeometry) {
    this.initializeFromGeometry(geometry);
  }

  private initializeFromGeometry(geometry: THREE.BufferGeometry) {
    const positions = geometry.getAttribute('position');
    const count = positions.count;

    // Create vertices
    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      );
      this.vertices.push({
        position: pos.clone(),
        previousPosition: pos.clone(),
        velocity: new THREE.Vector3(),
        pinned: false,
        mass: 1,
      });
    }

    // Create spring constraints based on triangle edges
    const index = geometry.getIndex();
    if (index) {
      const edgeSet = new Set<string>();
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i);
        const b = index.getX(i + 1);
        const c = index.getX(i + 2);
        
        this.addEdge(a, b, edgeSet);
        this.addEdge(b, c, edgeSet);
        this.addEdge(c, a, edgeSet);
      }
    }
  }

  private addEdge(a: number, b: number, edgeSet: Set<string>) {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      const restLength = this.vertices[a].position.distanceTo(this.vertices[b].position);
      this.constraints.push({
        vertexA: a,
        vertexB: b,
        restLength,
        stiffness: 0.5,
      });
    }
  }

  public pinVertex(index: number, position: THREE.Vector3) {
    if (this.vertices[index]) {
      this.vertices[index].pinned = true;
      this.vertices[index].position.copy(position);
    }
  }

  public unpinVertex(index: number) {
    if (this.vertices[index]) {
      this.vertices[index].pinned = false;
    }
  }

  public update(deltaTime: number = 1/60) {
    // Apply gravity and integrate
    for (const vertex of this.vertices) {
      if (!vertex.pinned) {
        // Verlet integration
        const temp = vertex.position.clone();
        vertex.velocity.copy(vertex.position).sub(vertex.previousPosition).multiplyScalar(this.damping);
        vertex.position.add(vertex.velocity);
        vertex.position.add(this.gravity);
        vertex.previousPosition.copy(temp);
      }
    }

    // Satisfy constraints (multiple iterations for stability)
    for (let iter = 0; iter < 3; iter++) {
      for (const constraint of this.constraints) {
        const vertexA = this.vertices[constraint.vertexA];
        const vertexB = this.vertices[constraint.vertexB];
        
        const diff = new THREE.Vector3().subVectors(vertexB.position, vertexA.position);
        const distance = diff.length();
        
        if (distance > constraint.restLength * this.maxStretch || distance < constraint.restLength * 0.9) {
          const correction = diff.multiplyScalar((distance - constraint.restLength) / distance * 0.5 * constraint.stiffness);
          
          if (!vertexA.pinned) vertexA.position.add(correction);
          if (!vertexB.pinned) vertexB.position.sub(correction);
        }
      }
    }
  }

  public applyToGeometry(geometry: THREE.BufferGeometry) {
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < this.vertices.length && i < positions.count; i++) {
      positions.setXYZ(
        i,
        this.vertices[i].position.x,
        this.vertices[i].position.y,
        this.vertices[i].position.z
      );
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  public getVertexCount(): number {
    return this.vertices.length;
  }
}

// Create a low-poly shirt mesh - larger to cover torso properly
export function createShirtGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  // Simple shirt shape: wider torso to cover body
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  // Larger torso dimensions for better body coverage
  const torsoWidth = 1.2;  // Increased from 0.6
  const torsoHeight = 1.0; // Increased from 0.8
  const gridX = 12;        // More vertices for better deformation
  const gridY = 10;

  for (let y = 0; y <= gridY; y++) {
    for (let x = 0; x <= gridX; x++) {
      const u = x / gridX;
      const v = y / gridY;
      
      // Add some curvature to wrap around body
      const xPos = (u - 0.5) * torsoWidth;
      const yPos = (0.5 - v) * torsoHeight;
      const zPos = 0.02 + Math.cos((u - 0.5) * Math.PI) * 0.05; // Slight curve
      
      vertices.push(xPos, yPos, zPos);
      uvs.push(u, 1 - v);
    }
  }

  // Create triangles for torso
  for (let y = 0; y < gridY; y++) {
    for (let x = 0; x < gridX; x++) {
      const a = y * (gridX + 1) + x;
      const b = a + 1;
      const c = a + (gridX + 1);
      const d = c + 1;
      
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// Create a low-poly pants mesh - larger for better leg coverage
export function createPantsGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  // Larger dimensions for better coverage
  const legWidth = 0.35;   // Increased from 0.15
  const legHeight = 1.0;   // Increased from 0.7
  const legSpacing = 0.2;  // Space between legs
  const gridX = 6;
  const gridY = 12;

  // Left leg
  for (let y = 0; y <= gridY; y++) {
    for (let x = 0; x <= gridX; x++) {
      const u = x / gridX;
      const v = y / gridY;
      
      // Taper the leg slightly toward bottom
      const taperFactor = 1 - v * 0.2;
      const xPos = (u - 0.5) * legWidth * taperFactor - legSpacing;
      const yPos = (0.5 - v) * legHeight - 0.2;
      const zPos = 0.02;
      
      vertices.push(xPos, yPos, zPos);
      uvs.push(u * 0.5, 1 - v);
    }
  }

  // Right leg
  const offset = (gridX + 1) * (gridY + 1);
  for (let y = 0; y <= gridY; y++) {
    for (let x = 0; x <= gridX; x++) {
      const u = x / gridX;
      const v = y / gridY;
      
      const taperFactor = 1 - v * 0.2;
      const xPos = (u - 0.5) * legWidth * taperFactor + legSpacing;
      const yPos = (0.5 - v) * legHeight - 0.2;
      const zPos = 0.02;
      
      vertices.push(xPos, yPos, zPos);
      uvs.push(0.5 + u * 0.5, 1 - v);
    }
  }

  // Create triangles for both legs
  for (let leg = 0; leg < 2; leg++) {
    const legOffset = leg * offset;
    for (let y = 0; y < gridY; y++) {
      for (let x = 0; x < gridX; x++) {
        const a = legOffset + y * (gridX + 1) + x;
        const b = a + 1;
        const c = a + (gridX + 1);
        const d = c + 1;
        
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// Create a low-poly skirt mesh - larger for better coverage
export function createSkirtGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  // Larger dimensions
  const topWidth = 0.6;    // Increased from 0.3
  const bottomWidth = 1.0; // Increased from 0.5
  const height = 0.7;      // Increased from 0.5
  const gridX = 14;
  const gridY = 10;

  for (let y = 0; y <= gridY; y++) {
    const v = y / gridY;
    const width = topWidth + (bottomWidth - topWidth) * v;
    
    for (let x = 0; x <= gridX; x++) {
      const u = x / gridX;
      
      const xPos = (u - 0.5) * width;
      const yPos = (0.5 - v) * height - 0.15;
      const zPos = 0.02 + Math.cos((u - 0.5) * Math.PI) * 0.03; // Slight curve
      
      vertices.push(xPos, yPos, zPos);
      uvs.push(u, 1 - v);
    }
  }

  for (let y = 0; y < gridY; y++) {
    for (let x = 0; x < gridX; x++) {
      const a = y * (gridX + 1) + x;
      const b = a + 1;
      const c = a + (gridX + 1);
      const d = c + 1;
      
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export function createGarmentGeometry(type: GarmentType): THREE.BufferGeometry {
  switch (type) {
    case 'shirt':
      return createShirtGeometry();
    case 'pants':
      return createPantsGeometry();
    case 'skirt':
      return createSkirtGeometry();
    default:
      return createShirtGeometry();
  }
}
