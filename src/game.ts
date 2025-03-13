import * as THREE from 'three';
import * as Matter from 'matter-js';

interface RopeSegment {
    position: THREE.Vector3;
    prevPosition: THREE.Vector3;
    velocity: THREE.Vector3;
    mass: number;
}

interface Rope {
    segments: RopeSegment[];
    mesh: THREE.Line;
    length: number;
    isRetracting: boolean;
    isExtending: boolean;
}

class HelicopterGame {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    
    private physics: Matter.Engine;
    private helicopterBody: Matter.Body;
    private ground: Matter.Body;
    private helicopter: THREE.Group;
    private groundMesh: THREE.Mesh;
    private keys: Set<string> = new Set();
    private readonly MOVE_SPEED = 0.0002;
    private readonly VERTICAL_SPEED = 0.0001;
    private scenery: THREE.Group;
    private readonly SCENERY_DEPTH = -3; // How far back the scenery should be
    private readonly SCENERY_WIDTH = 200;
    private backgroundElements: { mesh: THREE.Mesh, startX: number }[] = [];
    private ropes: {
        left: Rope;
        right: Rope;
    };
    private ropeHooks: {
        left: THREE.Mesh;
        right: THREE.Mesh;
    };
    private readonly ROPE_SEGMENTS = 8;
    private readonly ROPE_LENGTH = 1.5;
    private readonly GRAVITY = 0.02;
    private readonly ROPE_DAMPING = 0.995;
    private readonly MIN_ROPE_LENGTH = 0.2;
    private readonly MAX_ROPE_LENGTH = 4;
    private readonly ROPE_SPEED = 0.1;
    private readonly ROPE_RETRACT_SPEED = 0.1;
    private readonly ROPE_EXTEND_SPEED = 0.1;
    private readonly HOOK_MASS = 2.0;
    private readonly ROPE_MASS = 0.1;
    private readonly VELOCITY_INFLUENCE = 0.15;
    private readonly FLOOR_Y = -4; // Match your floor height

    constructor() {
        // Three.js setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 10);
        
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Matter.js setup
        this.physics = Matter.Engine.create({
            gravity: { x: 0, y: 0.001 }
        });

        // Create helicopter
        this.createHelicopter();
        this.createGround();
        this.createScenery();
        this.createRopes();
        this.setupControls();
        this.animate();
    }

    private createHelicopter() {
        // Physics body
        this.helicopterBody = Matter.Bodies.rectangle(0, -5, 2, 1, {
            mass: 1,
            frictionAir: 0.1
        });
        Matter.Composite.add(this.physics.world, this.helicopterBody);

        // Visual body
        this.helicopter = new THREE.Group();
        const bodyGeometry = new THREE.BoxGeometry(2, 1, 1);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.helicopter.add(bodyMesh);
        this.scene.add(this.helicopter);
    }

    private createGround() {
        // Physics ground
        this.ground = Matter.Bodies.rectangle(0, 8, 20, 1, {
            isStatic: true
        });
        Matter.Composite.add(this.physics.world, this.ground);

        // Visual ground
        const geometry = new THREE.BoxGeometry(20, 1, 3);
        const material = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
        this.groundMesh = new THREE.Mesh(geometry, material);
        this.groundMesh.position.y = -8;
        this.scene.add(this.groundMesh);
    }

    private createScenery() {
        this.scenery = new THREE.Group();
        
        // Create initial set of background elements
        for (let i = -this.SCENERY_WIDTH/2; i < this.SCENERY_WIDTH/2; i += 10) {
            this.addBackgroundElements(i);
        }
        
        this.scene.add(this.scenery);
    }

    private createTree(x: number, scale: number = 1): THREE.Group {
        const tree = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.BoxGeometry(0.4 * scale, 2 * scale, 0.4 * scale);
        const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        // Leaves (cone shape)
        const leavesGeometry = new THREE.ConeGeometry(1 * scale, 2.5 * scale, 6);
        const leavesMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 2 * scale;
        
        tree.add(trunk);
        tree.add(leaves);
        tree.position.set(x, -7, this.SCENERY_DEPTH);
        
        return tree;
    }

    private createHouse(x: number): THREE.Group {
        const house = new THREE.Group();
        
        // House body
        const bodyGeometry = new THREE.BoxGeometry(3, 2.5, 2);
        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xDEB887 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        
        // Roof
        const roofGeometry = new THREE.ConeGeometry(2.2, 1.5, 4);
        const roofMaterial = new THREE.MeshBasicMaterial({ color: 0x8B0000 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 2;
        
        // Window
        const windowGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.1);
        const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEEB });
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(-0.7, 0, 1.1);
        const window2 = window1.clone();
        window2.position.set(0.7, 0, 1.1);
        
        house.add(body);
        house.add(roof);
        house.add(window1);
        house.add(window2);
        house.position.set(x, -7, this.SCENERY_DEPTH);
        
        return house;
    }

    private addBackgroundElements(startX: number) {
        // Add random arrangement of trees and houses
        for (let x = startX; x < startX + 10; x += 2) {
            if (Math.random() < 0.7) { // 70% chance for tree
                const tree = this.createTree(x, 0.8 + Math.random() * 0.4);
                this.scenery.add(tree);
                this.backgroundElements.push({ mesh: tree, startX: x });
            }
            if (Math.random() < 0.3) { // 30% chance for house
                const house = this.createHouse(x + 1);
                this.scenery.add(house);
                this.backgroundElements.push({ mesh: house, startX: x + 1 });
            }
        }
    }

    private updateScenery() {
        const cameraX = this.camera.position.x;
        
        // Check if we need to generate more scenery on the right
        const rightmostElement = Math.max(...this.backgroundElements.map(e => e.startX));
        if (cameraX + this.SCENERY_WIDTH/4 > rightmostElement) {
            this.addBackgroundElements(rightmostElement);
        }
        
        // Check if we need to generate more scenery on the left
        const leftmostElement = Math.min(...this.backgroundElements.map(e => e.startX));
        if (cameraX - this.SCENERY_WIDTH/4 < leftmostElement) {
            this.addBackgroundElements(leftmostElement - 10);
        }
        
        // Remove far away elements
        this.backgroundElements = this.backgroundElements.filter(element => {
            if (Math.abs(element.startX - cameraX) > this.SCENERY_WIDTH) {
                this.scenery.remove(element.mesh);
                return false;
            }
            return true;
        });
    }

    private setupControls() {
        // Track both keydown and keyup
        window.addEventListener('keydown', (event) => {
            // Prevent default browser behavior for game controls
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
                 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE'].includes(event.code)) {
                event.preventDefault();
            }
            
            this.keys.add(event.code);

            // Rope controls
            switch (event.code) {
                case 'KeyQ': // Retract left rope
                    this.ropes.left.isRetracting = true;
                    this.ropes.left.isExtending = false;
                    break;
                case 'KeyA': // Extend left rope
                    this.ropes.left.isExtending = true;
                    this.ropes.left.isRetracting = false;
                    break;
                case 'KeyE': // Retract right rope
                    this.ropes.right.isRetracting = true;
                    this.ropes.right.isExtending = false;
                    break;
                case 'KeyD': // Extend right rope
                    this.ropes.right.isExtending = true;
                    this.ropes.right.isRetracting = false;
                    break;
            }
        });

        window.addEventListener('keyup', (event) => {
            // Prevent default browser behavior for game controls
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
                 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE'].includes(event.code)) {
                event.preventDefault();
            }
            
            this.keys.delete(event.code);

            // Reset rope controls
            switch (event.code) {
                case 'KeyQ':
                    this.ropes.left.isRetracting = false;
                    break;
                case 'KeyA':
                    this.ropes.left.isExtending = false;
                    break;
                case 'KeyE':
                    this.ropes.right.isRetracting = false;
                    break;
                case 'KeyD':
                    this.ropes.right.isExtending = false;
                    break;
            }
        });
    }

    private updateMovement() {
        // Vertical movement
        if (this.keys.has('ArrowUp')) {
            Matter.Body.applyForce(this.helicopterBody,
                this.helicopterBody.position,
                { x: 0, y: -this.VERTICAL_SPEED });
        }
        if (this.keys.has('ArrowDown')) {
            Matter.Body.applyForce(this.helicopterBody,
                this.helicopterBody.position,
                { x: 0, y: this.VERTICAL_SPEED });
        }

        // Horizontal movement with smooth acceleration
        if (this.keys.has('ArrowLeft')) {
            Matter.Body.applyForce(this.helicopterBody,
                this.helicopterBody.position,
                { x: -this.MOVE_SPEED, y: 0 });
            
            // Add slight tilt when moving
            this.helicopter.rotation.z = Math.min(this.helicopter.rotation.z + 0.1, 0.3);
        }
        if (this.keys.has('ArrowRight')) {
            Matter.Body.applyForce(this.helicopterBody,
                this.helicopterBody.position,
                { x: this.MOVE_SPEED, y: 0 });
            
            // Add slight tilt when moving
            this.helicopter.rotation.z = Math.max(this.helicopter.rotation.z - 0.1, -0.3);
        }

        // Return to neutral tilt when not moving horizontally
        if (!this.keys.has('ArrowLeft') && !this.keys.has('ArrowRight')) {
            this.helicopter.rotation.z *= 0.9; // Smooth return to upright
        }

        // Add slight air resistance
        Matter.Body.setVelocity(this.helicopterBody, {
            x: this.helicopterBody.velocity.x * 0.98,
            y: this.helicopterBody.velocity.y * 0.98
        });

        // Limit maximum velocity
        const maxSpeed = 3;
        const vel = this.helicopterBody.velocity;
        Matter.Body.setVelocity(this.helicopterBody, {
            x: Math.max(-maxSpeed, Math.min(maxSpeed, vel.x)),
            y: Math.max(-maxSpeed, Math.min(maxSpeed, vel.y))
        });
    }

    private createRopes() {
        // Create rope segments with mass
        const createRopeSegments = (startX: number) => {
            const segments: RopeSegment[] = [];
            for (let i = 0; i < this.ROPE_SEGMENTS; i++) {
                segments.push({
                    position: new THREE.Vector3(startX, 0, 0),
                    prevPosition: new THREE.Vector3(startX, 0, 0),
                    velocity: new THREE.Vector3(0, 0, 0),
                    mass: i === this.ROPE_SEGMENTS - 1 ? this.HOOK_MASS : this.ROPE_MASS
                });
            }
            return segments;
        };

        // Create rope visuals
        const ropeGeometry = new THREE.BufferGeometry();
        const ropeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x000000,
            linewidth: 2 
        });

        this.ropes = {
            left: {
                segments: createRopeSegments(-1),
                mesh: new THREE.Line(ropeGeometry.clone(), ropeMaterial.clone()),
                length: this.ROPE_LENGTH,
                isRetracting: false,
                isExtending: false
            },
            right: {
                segments: createRopeSegments(1),
                mesh: new THREE.Line(ropeGeometry.clone(), ropeMaterial.clone()),
                length: this.ROPE_LENGTH,
                isRetracting: false,
                isExtending: false
            }
        };

        // Create hooks
        const hookGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
        const hookMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });

        this.ropeHooks = {
            left: new THREE.Mesh(hookGeometry, hookMaterial.clone()),
            right: new THREE.Mesh(hookGeometry, hookMaterial.clone())
        };

        // Add to scene
        this.scene.add(this.ropes.left.mesh);
        this.scene.add(this.ropes.right.mesh);
        this.scene.add(this.ropeHooks.left);
        this.scene.add(this.ropeHooks.right);
    }

    private updateRopeLength(rope: Rope) {
        if (rope.isRetracting) {
            // Retract rope
            rope.length = Math.max(
                this.MIN_ROPE_LENGTH, 
                rope.length - this.ROPE_RETRACT_SPEED
            );
        } else if (rope.isExtending) {
            // Extend rope
            rope.length = Math.min(
                this.MAX_ROPE_LENGTH,
                rope.length + this.ROPE_EXTEND_SPEED
            );
        }
        // If neither retracting nor extending, length stays the same
    }

    private updateRopePhysics(rope: Rope, anchorX: number) {
        // Ensure rope length stays within bounds
        rope.length = Math.max(this.MIN_ROPE_LENGTH, 
                     Math.min(this.MAX_ROPE_LENGTH, rope.length));

        const segments = rope.segments;
        const segmentLength = rope.length / (this.ROPE_SEGMENTS - 1);

        // First point follows helicopter
        segments[0].position.set(
            this.helicopter.position.x + anchorX,
            this.helicopter.position.y,
            0
        );

        // Update all other points
        for (let i = 1; i < segments.length; i++) {
            const segment = segments[i];
            
            // Store current position
            segment.prevPosition.copy(segment.position);
            
            // Apply gravity
            segment.velocity.y -= this.GRAVITY * segment.mass;
            
            // Add helicopter influence
            const helicopterVel = new THREE.Vector3(
                this.helicopterBody.velocity.x,
                -this.helicopterBody.velocity.y,
                0
            );
            segment.velocity.add(
                helicopterVel.clone().multiplyScalar(
                    this.VELOCITY_INFLUENCE * (segment.mass / this.HOOK_MASS)
                )
            );
            
            // Update position
            segment.position.add(segment.velocity);
            
            // Floor collision
            if (segment.position.y < this.FLOOR_Y) {
                segment.position.y = this.FLOOR_Y;
                segment.velocity.y = Math.max(0, segment.velocity.y);
                // Add some friction when touching floor
                segment.velocity.x *= 0.8;
            }
            
            // Apply damping
            const massDamping = this.ROPE_DAMPING * (1 + (1 - segment.mass / this.HOOK_MASS) * 0.02);
            segment.velocity.multiplyScalar(massDamping);
        }

        // Solve distance constraints
        for (let j = 0; j < 5; j++) {
            for (let i = 0; i < segments.length - 1; i++) {
                const segmentA = segments[i];
                const segmentB = segments[i + 1];
                
                const diff = segmentB.position.clone().sub(segmentA.position);
                const currentDist = diff.length();
                
                if (currentDist > 0 && currentDist !== segmentLength) {
                    const correction = diff.multiplyScalar(
                        (currentDist - segmentLength) / currentDist
                    );

                    const massRatioA = segmentA.mass / (segmentA.mass + segmentB.mass);
                    const massRatioB = segmentB.mass / (segmentA.mass + segmentB.mass);

                    if (i > 0) {
                        // Don't move segments below floor
                        const newPosA = segmentA.position.clone().add(correction.clone().multiplyScalar(massRatioB * 0.5));
                        const newPosB = segmentB.position.clone().sub(correction.clone().multiplyScalar(massRatioA * 0.5));
                        
                        if (newPosA.y >= this.FLOOR_Y) {
                            segmentA.position.copy(newPosA);
                        }
                        if (newPosB.y >= this.FLOOR_Y) {
                            segmentB.position.copy(newPosB);
                        }
                    } else {
                        // First segment is fixed to helicopter
                        const newPosB = segmentB.position.clone().sub(correction);
                        if (newPosB.y >= this.FLOOR_Y) {
                            segmentB.position.copy(newPosB);
                        }
                    }
                }
            }
        }

        // Update rope geometry
        const positions = segments.map(s => s.position);
        rope.mesh.geometry.setFromPoints(positions);

        // Update hook
        const hookMesh = anchorX < 0 ? this.ropeHooks.left : this.ropeHooks.right;
        const endSegment = segments[segments.length - 1];
        const secondToLastSegment = segments[segments.length - 2];
        
        hookMesh.position.copy(endSegment.position);
        
        // Calculate hook rotation
        const direction = endSegment.position.clone().sub(secondToLastSegment.position);
        const angle = Math.atan2(direction.y, direction.x) + Math.PI / 2;
        hookMesh.rotation.z = angle;
    }

    private animate() {
        requestAnimationFrame(() => this.animate());

        this.updateMovement();
        Matter.Engine.update(this.physics, 1000/60);

        // Update helicopter position
        this.helicopter.position.x = this.helicopterBody.position.x;
        this.helicopter.position.y = -this.helicopterBody.position.y;

        // Update ropes
        this.updateRopePhysics(this.ropes.left, -1);
        this.updateRopePhysics(this.ropes.right, 1);

        // Update camera
        const cameraSpeed = 0.1;
        this.camera.position.x += (this.helicopter.position.x - this.camera.position.x) * cameraSpeed;
        this.updateScenery();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
new HelicopterGame(); 
new HelicopterGame(); 