import * as THREE from 'three';

export class Level {
    public scene: THREE.Group;
    private scenery: THREE.Group;
    
    // Constants
    private readonly GROUND_Y = -2;
    private readonly SCENE_DEPTH = -15;

    constructor() {
        this.scene = new THREE.Group();
        this.scenery = new THREE.Group();
        this.scene.add(this.scenery);
        
        this.createGround();
        this.createScenery();
    }

    private createGround() {
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x33aa33,
            side: THREE.DoubleSide,
            roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = Math.PI / 2;
        ground.position.y = this.GROUND_Y;
        this.scene.add(ground);
    }

    private createScenery() {
        // Create trees and buildings across the landscape
        for (let x = -100; x < 100; x += 8) {
            if (Math.random() < 0.7) {
                this.addTree(x);
            } else {
                this.addBuilding(x);
            }
        }
    }

    private addTree(x: number) {
        const height = 2 + Math.random() * 3;
        
        // Create trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, height);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.8
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        
        // Create leaves
        const leavesGeometry = new THREE.ConeGeometry(1.5, height * 0.7);
        const leavesMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228B22,
            roughness: 0.7
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        
        // Position tree parts
        trunk.position.set(
            x, 
            this.GROUND_Y + height / 2, 
            this.SCENE_DEPTH + Math.random() * 5
        );
        leaves.position.set(
            x, 
            this.GROUND_Y + height * 1.2, 
            trunk.position.z
        );
        
        this.scenery.add(trunk);
        this.scenery.add(leaves);
    }

    private addBuilding(x: number) {
        const height = 4 + Math.random() * 4;
        const width = 3 + Math.random() * 2;
        
        // Create building body
        const buildingGeometry = new THREE.BoxGeometry(width, height, width);
        const buildingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.7
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        
        // Add windows
        const windowGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.1);
        const windowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFFF99,
            emissive: 0x555555
        });

        // Create window pattern
        const windowRows = Math.floor(height / 1.2);
        const windowCols = Math.floor(width / 1.2);
        
        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                if (Math.random() > 0.3) {
                    const window = new THREE.Mesh(windowGeometry, windowMaterial);
                    window.position.set(
                        (col - (windowCols - 1) / 2) * 1.2,
                        (row - (windowRows - 1) / 2) * 1.2,
                        width / 2 + 0.1
                    );
                    building.add(window);
                }
            }
        }
        
        building.position.set(
            x,
            this.GROUND_Y + height / 2,
            this.SCENE_DEPTH + Math.random() * 5
        );
        
        this.scenery.add(building);
    }
} 