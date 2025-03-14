import * as THREE from 'three';

interface RopeSegment {
    mesh: THREE.Mesh;
    position: THREE.Vector3;
    prevPosition: THREE.Vector3;
    velocity: THREE.Vector3;
}

export class Rope {
    private segments: RopeSegment[];
    private hook: THREE.Mesh;
    private ropeGroup: THREE.Group;
    private length: number = 0;
    private targetLength: number = 0;

    // Adjusted constants
    private readonly MIN_LENGTH = 0.1;     // Shorter minimum
    private readonly MAX_LENGTH = 3;       // Shorter maximum
    private readonly SEGMENT_COUNT = 15;   // More segments
    private readonly EXTEND_SPEED = 0.06;
    private readonly GRAVITY = 0.012;
    private readonly DAMPING = 0.98;
    private readonly HOOK_SIZE = 0.15;
    private readonly SEGMENT_RADIUS = 0.03; // Rope thickness
    private readonly PARENT_VELOCITY_INFLUENCE = 0.005;

    constructor(scene: THREE.Scene, anchorPoint: THREE.Vector3) {
        this.ropeGroup = new THREE.Group();
        scene.add(this.ropeGroup);

        // Initialize segments with meshes
        this.segments = [];
        const segmentGeometry = new THREE.CylinderGeometry(
            this.SEGMENT_RADIUS, 
            this.SEGMENT_RADIUS, 
            0.1,  // Initial length, will be updated
            6     // Hexagonal cross-section
        );
        const segmentMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x303030,
            roughness: 0.7,
            metalness: 0.2
        });

        for (let i = 0; i < this.SEGMENT_COUNT; i++) {
            const mesh = new THREE.Mesh(segmentGeometry, segmentMaterial);
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

        // Update physics for other segments
        for (let i = 1; i < this.segments.length; i++) {
            const segment = this.segments[i];
            
            segment.prevPosition.copy(segment.position);
            segment.velocity.y -= this.GRAVITY;
            
            if (i === this.segments.length - 1) {
                segment.velocity.add(
                    parentVelocity.clone().multiplyScalar(this.PARENT_VELOCITY_INFLUENCE)
                );
            }
            
            segment.position.add(segment.velocity);
            segment.velocity.multiplyScalar(this.DAMPING);
        }

        // Solve distance constraints
        for (let j = 0; j < 3; j++) {
            for (let i = 0; i < this.segments.length - 1; i++) {
                const segmentA = this.segments[i];
                const segmentB = this.segments[i + 1];
                
                const diff = segmentB.position.clone().sub(segmentA.position);
                const currentDist = diff.length();
                
                if (currentDist > 0) {
                    const correction = diff.multiplyScalar(
                        (currentDist - segmentLength) / currentDist * 0.5
                    );
                    
                    if (i > 0) {
                        segmentA.position.add(correction);
                        segmentB.position.sub(correction);
                    } else {
                        segmentB.position.sub(correction.multiplyScalar(2));
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
            
            // Update segment mesh
            segment.mesh.position.copy(segment.position);
            
            // Point cylinder to next segment
            if (segmentDist > 0) {
                segment.mesh.lookAt(nextSegment.position);
                segment.mesh.rotateX(Math.PI / 2);
                
                // Update cylinder height to match distance
                segment.mesh.scale.y = segmentDist;
            }
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
        this.targetLength = Math.min(
            this.targetLength + this.EXTEND_SPEED,
            this.MAX_LENGTH
        );
    }

    public retract() {
        this.targetLength = Math.max(
            this.targetLength - this.EXTEND_SPEED,
            this.MIN_LENGTH
        );
    }
} 