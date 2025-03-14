import * as THREE from 'three';
import { Controls } from '../game';

export class Helicopter {
    public mesh: THREE.Group;
    private velocity: THREE.Vector3;
    private acceleration: THREE.Vector3;
    private rotorMesh: THREE.Mesh;
    private rotorAngle: number = 0;
    private targetHeight: number;

    // Adjusted physics constants
    private readonly INITIAL_HEIGHT = 5;
    private readonly HOVER_VARIANCE = 0.1;
    private readonly HOVER_SPEED = 0.002;
    private readonly MAX_HORIZONTAL_SPEED = 1.0;
    private readonly MAX_VERTICAL_SPEED = 1.0;
    private readonly HORIZONTAL_ACCELERATION = 0.004;
    private readonly VERTICAL_ACCELERATION = 0.008;
    private readonly HORIZONTAL_DAMPING = 0.98;
    private readonly VERTICAL_DAMPING = 0.85;      // Increased damping for stability
    private readonly HEIGHT_CHANGE_SPEED = 0.15;
    private readonly GROUND_LEVEL = -2;           // Match with Level's ground Y
    private readonly MIN_HEIGHT = 0.5;            // Minimum height above ground
    private time: number = 0;

    // Add roll constants
    private readonly MAX_ROLL_ANGLE = 0.3;  // About 17 degrees
    private readonly ROLL_RESPONSE = 15;     // How quickly the helicopter rolls
    private currentRoll: number = 0;

    constructor(scene: THREE.Scene) {
        this.mesh = new THREE.Group();
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.targetHeight = this.INITIAL_HEIGHT;

        this.createHelicopter();
        scene.add(this.mesh);

        // Set initial position
        this.mesh.position.set(0, this.INITIAL_HEIGHT, 0);
    }

    private createHelicopter() {
        // Main body
        const bodyGeometry = new THREE.BoxGeometry(2, 1, 1);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4444ff,
            metalness: 0.5,
            roughness: 0.5
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.add(body);

        // Main rotor
        const rotorGeometry = new THREE.BoxGeometry(5, 0.1, 0.2);
        const rotorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            metalness: 0.8
        });
        this.rotorMesh = new THREE.Mesh(rotorGeometry, rotorMaterial);
        this.rotorMesh.position.y = 0.6;
        this.mesh.add(this.rotorMesh);

        // Tail
        const tailGeometry = new THREE.BoxGeometry(0.2, 0.2, 2);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.z = -1.5;
        this.mesh.add(tail);

        // Tail rotor
        const tailRotorGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.1);
        const tailRotor = new THREE.Mesh(tailRotorGeometry, rotorMaterial);
        tailRotor.position.z = -2.5;
        tailRotor.position.y = 0.2;
        this.mesh.add(tailRotor);
    }

    public update(controls: Controls, deltaTime: number) {
        this.time += deltaTime;

        // Store previous velocity for acceleration calculation
        const previousVelocityX = this.velocity.x;

        // Calculate hover offset
        const hoverOffset = Math.sin(this.time * this.HOVER_SPEED) * this.HOVER_VARIANCE;

        // Handle controls and set acceleration
        if (controls.left) {
            this.acceleration.x = -this.HORIZONTAL_ACCELERATION;
        } else if (controls.right) {
            this.acceleration.x = this.HORIZONTAL_ACCELERATION;
        } else {
            // When no input, acceleration opposes current velocity for deceleration
            this.acceleration.x = -this.velocity.x * 0.1;
        }

        // Update target height based on vertical controls
        if (controls.up) {
            this.targetHeight += this.HEIGHT_CHANGE_SPEED;
        } else if (controls.down) {
            // Only allow going down if above minimum height
            if (this.targetHeight > this.GROUND_LEVEL + this.MIN_HEIGHT) {
                this.targetHeight -= this.HEIGHT_CHANGE_SPEED;
            }
        }

        // Ensure target height doesn't go below ground
        this.targetHeight = Math.max(
            this.GROUND_LEVEL + this.MIN_HEIGHT, 
            this.targetHeight
        );

        // Smoother vertical movement
        const heightDiff = (this.targetHeight + hoverOffset) - this.mesh.position.y;
        this.acceleration.y = heightDiff * 0.1; // Reduced for more stability

        // Apply acceleration to velocity
        this.velocity.add(this.acceleration);

        // Apply damping
        this.velocity.x *= this.HORIZONTAL_DAMPING;
        this.velocity.y *= this.VERTICAL_DAMPING;

        // Limit maximum speeds
        this.velocity.x = THREE.MathUtils.clamp(
            this.velocity.x, 
            -this.MAX_HORIZONTAL_SPEED, 
            this.MAX_HORIZONTAL_SPEED
        );
        this.velocity.y = THREE.MathUtils.clamp(
            this.velocity.y, 
            -this.MAX_VERTICAL_SPEED, 
            this.MAX_VERTICAL_SPEED
        );

        // Update position
        const nextY = this.mesh.position.y + this.velocity.y;
        
        // Ground collision check
        if (nextY <= this.GROUND_LEVEL + this.MIN_HEIGHT) {
            this.mesh.position.y = this.GROUND_LEVEL + this.MIN_HEIGHT;
            this.velocity.y = 0;
            this.targetHeight = this.GROUND_LEVEL + this.MIN_HEIGHT;
        } else {
            this.mesh.position.y = nextY;
        }
        
        // Update horizontal position
        this.mesh.position.x += this.velocity.x;

        // Calculate actual acceleration (change in velocity)
        const actualAcceleration = this.velocity.x - previousVelocityX;

        // Calculate target roll based on acceleration
        const targetRoll = -actualAcceleration * this.ROLL_RESPONSE;

        // Clamp target roll to maximum angles
        const clampedTargetRoll = THREE.MathUtils.clamp(
            targetRoll,
            -this.MAX_ROLL_ANGLE,
            this.MAX_ROLL_ANGLE
        );

        // Smoothly interpolate current roll to target roll
        this.currentRoll = THREE.MathUtils.lerp(
            this.currentRoll,
            clampedTargetRoll,
            0.15
        );

        // Apply roll to helicopter
        this.mesh.rotation.z = this.currentRoll;

        // Rotate main rotor
        this.rotorAngle += 0.3;
        this.rotorMesh.rotation.y = this.rotorAngle;

        // Update vertical tilt
        const verticalTilt = this.velocity.y * 0.2;
        this.mesh.rotation.x = THREE.MathUtils.lerp(
            this.mesh.rotation.x,
            verticalTilt,
            0.1
        );
    }

    // Add method to get current target height (useful for debugging)
    public getTargetHeight(): number {
        return this.targetHeight;
    }
} 