import * as THREE from 'three';
import { LayerManager, CollisionLayer } from '../managers/LayerManager';

interface RopeSegment {
    mesh: THREE.Mesh;
    position: THREE.Vector3;
    prevPosition: THREE.Vector3;
    velocity: THREE.Vector3;
}

export class Rope {
    public debug: boolean = false;
    private segments: RopeSegment[];
    private hook: THREE.Mesh;
    private ropeGroup: THREE.Group;
    private length: number = 0;
    private targetLength: number = 0;
    private lastDebugTime: number = 0;
    private readonly DEBUG_INTERVAL = 1000; // 1 second in milliseconds

    // Adjusted constants for debugging
    private readonly MIN_LENGTH = 0.1;     // Absolute minimum length
    private readonly MAX_LENGTH = 3;       // Maximum total length
    private readonly SEGMENT_COUNT = 15;   
    private readonly EXTEND_SPEED = 0.06;
    private readonly GRAVITY = 0.008;           // Reduced gravity
    private readonly DAMPING = 0.98;
    private readonly HOOK_SIZE = 0.15;
    private readonly SEGMENT_RADIUS = 0.02; // Thinner rope for testing
    private readonly PARENT_VELOCITY_INFLUENCE = 0.005;
    private readonly BASE_SEGMENT_LENGTH = 0.1; // Base length for cylinder geometry
    private readonly HOOK_MASS = 0.5;           // Reduced hook mass
    private readonly CONSTRAINT_ITERATIONS = 20; // Many more iterations for very stiff rope
    private readonly TENSION_STIFFNESS = 1.0;   // Maximum stiffness
    private readonly HOOK_MOMENTUM_TRANSFER = 0.05; // Reduced momentum transfer
    private readonly BOUNCE_FACTOR = 0.3;   
    private readonly FRICTION = 0.8;        
    private raycaster: THREE.Raycaster;

    constructor(scene: THREE.Scene, anchorPoint: THREE.Vector3) {
        this.ropeGroup = new THREE.Group();
        scene.add(this.ropeGroup);

        // Initialize segments with meshes
        this.segments = [];
        // Create a SHORT cylinder for the base geometry
        const segmentGeometry = new THREE.CylinderGeometry(
            this.SEGMENT_RADIUS,    // top radius
            this.SEGMENT_RADIUS,    // bottom radius
            1,                      // height of 1 unit (will be scaled)
            6                       // hexagonal cross-section
        );
        // Rotate cylinder to lay flat along local Y axis
        segmentGeometry.rotateX(Math.PI / 2);
        
        const segmentMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x303030,
            roughness: 0.7,
            metalness: 0.2
        });

        for (let i = 0; i < this.SEGMENT_COUNT; i++) {
            const mesh = new THREE.Mesh(segmentGeometry, segmentMaterial);
            // Start with minimal scale
            mesh.scale.set(1, 0.01, 1);
            this.ropeGroup.add(mesh);

            this.segments.push({
                mesh,
                position: anchorPoint.clone(),
                prevPosition: anchorPoint.clone(),
                velocity: new THREE.Vector3()
            });
        }

        // Create hook
        const hookGeometry = new THREE.ConeGeometry(
            this.HOOK_SIZE, 
            this.HOOK_SIZE * 2, 
            8
        );
        const hookMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x505050,
            metalness: 0.8,
            roughness: 0.3
        });
        this.hook = new THREE.Mesh(hookGeometry, hookMaterial);
        this.ropeGroup.add(this.hook);

        // Start with minimum length
        this.length = this.MIN_LENGTH;
        this.targetLength = this.MIN_LENGTH;
        this.raycaster = new THREE.Raycaster();
        // Enable all in-plane collision layers
        this.raycaster.layers.enable(CollisionLayer.GROUND);
        this.raycaster.layers.enable(CollisionLayer.WALLS);
        this.raycaster.layers.enable(CollisionLayer.OBSTACLES);
        this.raycaster.layers.enable(CollisionLayer.PLATFORMS);
    }

    public update(anchorPoint: THREE.Vector3, parentVelocity: THREE.Vector3) {
        // Update rope length
        if (this.length < this.targetLength) {
            this.length = Math.min(
                this.length + this.EXTEND_SPEED,
                this.targetLength
            );
        } else if (this.length > this.targetLength) {
            this.length = Math.max(
                this.length - this.EXTEND_SPEED,
                this.targetLength
            );
        }

        // Update first segment to anchor point
        this.segments[0].position.copy(anchorPoint);

        // Calculate segment length based on total rope length
        const segmentLength = this.length / (this.SEGMENT_COUNT - 1);
        // if (this.debug) {
        //     console.log('Individual segment length:', this.length, segmentLength);
        // }

        // Update physics for segments
        for (let i = 1; i < this.segments.length; i++) {
            const segment = this.segments[i];
            
            segment.prevPosition.copy(segment.position);
            
            // Apply forces
            if (i === this.segments.length - 1) {
                segment.velocity.y -= this.GRAVITY * this.HOOK_MASS;
                segment.velocity.add(
                    parentVelocity.clone().multiplyScalar(this.HOOK_MOMENTUM_TRANSFER)
                );

                // Ground collision detection using raycaster
                this.raycaster.ray.origin.copy(segment.position);
                this.raycaster.ray.origin.y += 0.1;
                this.raycaster.ray.direction.set(0, -1, 0);

                // Check collision with all in-plane meshes
                const collidableMeshes = LayerManager.getInstance().getInPlaneMeshes();
                for (const mesh of collidableMeshes) {
                    const intersects = this.raycaster.intersectObject(mesh, false);
                    if (intersects.length > 0) {
                        const hitPoint = intersects[0].point;
                        const distance = segment.position.y - hitPoint.y;
                        
                        if (distance < 0.1) {
                            segment.position.y = hitPoint.y + 0.1;
                            if (segment.velocity.y < 0) {
                                segment.velocity.y = -segment.velocity.y * this.BOUNCE_FACTOR;
                                segment.velocity.x *= this.FRICTION;
                                segment.velocity.z *= this.FRICTION;
                            }
                            break; // Exit loop after handling first collision
                        }
                    }
                }
            } else {
                segment.velocity.y -= this.GRAVITY;
            }
            
            segment.position.add(segment.velocity);
            segment.velocity.multiplyScalar(this.DAMPING);
        }

        // Many more iterations for very stiff rope
        for (let j = 0; j < this.CONSTRAINT_ITERATIONS; j++) {
            for (let i = 0; i < this.segments.length - 1; i++) {
                const segmentA = this.segments[i];
                const segmentB = this.segments[i + 1];
                
                const diff = segmentB.position.clone().sub(segmentA.position);
                const currentDist = diff.length();
                
                if (currentDist > 0) {
                    const targetDist = this.length / (this.SEGMENT_COUNT - 1);
                    const correction = diff.multiplyScalar(
                        (currentDist - targetDist) / currentDist
                    );
                    
                    if (i > 0) {
                        segmentB.position.sub(correction);
                    } else {
                        // First segment anchored
                        segmentB.position.sub(correction);
                    }
                }
            }
        }

        // Update segment meshes
        for (let i = 0; i < this.segments.length - 1; i++) {
            const segment = this.segments[i];
            const nextSegment = this.segments[i + 1];
            
            // Calculate segment direction and length
            const direction = nextSegment.position.clone().sub(segment.position);
            const segmentDist = direction.length();
            
            if (segmentDist > 0) {
                // Position segment at midpoint between points
                segment.mesh.position.copy(segment.position);
                segment.mesh.position.lerp(nextSegment.position, 0.5);
                
                // Orient segment to point to next segment
                segment.mesh.lookAt(nextSegment.position);
                
                // Scale the segment length (using scale.y because we rotated the geometry)
                segment.mesh.scale.y = segmentDist;
            }
        }

        // Debug logging
        const currentTime = Date.now();
        if (this.debug && currentTime - this.lastDebugTime > this.DEBUG_INTERVAL) {
            const firstSegDist = this.segments[0].position.distanceTo(this.segments[1].position);
            console.log({
                targetLength: this.targetLength.toFixed(3),
                currentLength: this.length.toFixed(3),
                segmentCount: this.SEGMENT_COUNT,
                calculatedSegLength: (this.length / (this.SEGMENT_COUNT - 1)).toFixed(3),
                actualFirstSegLength: firstSegDist.toFixed(3)
            });
            this.lastDebugTime = currentTime;
        }

        // Update hook
        const lastSegment = this.segments[this.segments.length - 1];
        const secondLastSegment = this.segments[this.segments.length - 2];
        
        this.hook.position.copy(lastSegment.position);
        
        // Calculate hook rotation
        const direction = lastSegment.position.clone()
            .sub(secondLastSegment.position);
        const angle = Math.atan2(direction.y, direction.x) + Math.PI / 2;
        this.hook.rotation.z = angle;
    }

    public extend() {
        const newTargetLength = Math.min(
            this.targetLength + this.EXTEND_SPEED,
            this.MAX_LENGTH
        );
        
        // Log only when length changes
        if (newTargetLength !== this.targetLength) {
            console.log('Extending rope:', {
                previousTarget: this.targetLength.toFixed(3),
                newTarget: newTargetLength.toFixed(3),
                maxLength: this.MAX_LENGTH
            });
        }
        
        this.targetLength = newTargetLength;
    }

    public retract() {
        const newTargetLength = Math.max(
            this.targetLength - this.EXTEND_SPEED,
            this.MIN_LENGTH
        );
        
        // Log only when length changes
        if (this.debug && newTargetLength !== this.targetLength) {
            console.log('Retracting rope:', {
                previousTarget: this.targetLength.toFixed(3),
                newTarget: newTargetLength.toFixed(3),
                minLength: this.MIN_LENGTH
            });
        }
        
        this.targetLength = newTargetLength;
    }
} 