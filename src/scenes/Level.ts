// When creating level meshes
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
LayerManager.getInstance().registerCollidable(groundMesh, [CollisionLayer.GROUND]);

const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
LayerManager.getInstance().registerCollidable(wallMesh, [CollisionLayer.WALLS]);

const platform = new THREE.Mesh(platformGeometry, platformMaterial);
LayerManager.getInstance().registerCollidable(platform, [
    CollisionLayer.PLATFORMS,
    CollisionLayer.GROUND // Platform can be in multiple layers
]);

// When cleaning up
LayerManager.getInstance().clear(); 