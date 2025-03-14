import * as THREE from 'three';

export enum CollisionLayer {
    DEFAULT = 0,
    GROUND = 1,
    WALLS = 2,
    OBSTACLES = 3,
    PLATFORMS = 4,
    // Add more collision layers as needed
}

type CollisionMesh = {
    mesh: THREE.Mesh;
    layers: CollisionLayer[];
};

export class LayerManager {
    private static instance: LayerManager;
    private collidableMeshes: CollisionMesh[] = [];
    
    private constructor() {}

    public static getInstance(): LayerManager {
        if (!LayerManager.instance) {
            LayerManager.instance = new LayerManager();
        }
        return LayerManager.instance;
    }

    /**
     * Register a mesh as collidable with specified collision layers
     */
    public registerCollidable(mesh: THREE.Mesh, layers: CollisionLayer[]) {
        // Enable all specified layers on the mesh
        layers.forEach(layer => mesh.layers.enable(layer));
        
        this.collidableMeshes.push({
            mesh,
            layers
        });
    }

    /**
     * Unregister a mesh from collision system
     */
    public unregisterCollidable(mesh: THREE.Mesh) {
        const index = this.collidableMeshes.findIndex(item => item.mesh === mesh);
        if (index !== -1) {
            this.collidableMeshes.splice(index, 1);
        }
    }

    /**
     * Get all meshes that belong to specific layers
     */
    public getMeshesByLayers(layers: CollisionLayer[]): THREE.Mesh[] {
        return this.collidableMeshes
            .filter(item => 
                layers.some(layer => 
                    item.layers.includes(layer)
                )
            )
            .map(item => item.mesh);
    }

    /**
     * Get all in-plane collidable meshes (ground, walls, obstacles)
     */
    public getInPlaneMeshes(): THREE.Mesh[] {
        return this.getMeshesByLayers([
            CollisionLayer.GROUND,
            CollisionLayer.WALLS,
            CollisionLayer.OBSTACLES,
            CollisionLayer.PLATFORMS
        ]);
    }

    /**
     * Get all ground meshes (for backward compatibility)
     */
    public getGroundMeshes(): THREE.Mesh[] {
        return this.getMeshesByLayers([CollisionLayer.GROUND]);
    }

    /**
     * Clear all registered meshes
     */
    public clear() {
        this.collidableMeshes = [];
    }
} 