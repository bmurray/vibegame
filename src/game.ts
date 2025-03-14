import * as THREE from 'three';
import { Level } from './Level';
import { Helicopter } from './entities/Helicopter';

export interface Controls {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    q: boolean;
    w: boolean;
    e: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
    z: boolean;
    x: boolean;
    c: boolean;
    space: boolean;
}

// Add user inputs should be handled in the Game class, and push the inputs to the various entities as needed

export class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private level: Level;
    
    // Control state
    private controls: Controls = {
        up: false,
        down: false,
        left: false,
        right: false,
        q: false,
        w: false,
        e: false,
        a: false,
        s: false,
        d: false,
        z: false,
        x: false,
        c: false,
        space: false
    };

    private helicopter: Helicopter;
    private clock: THREE.Clock;

    constructor() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 15);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Setup lights
        this.setupLights();

        // Create level
        this.level = new Level();
        this.scene.add(this.level.scene);

        this.clock = new THREE.Clock();
        this.helicopter = new Helicopter(this.scene);

        this.setupControls();
        this.animate();
    }

    private setupLights() {
        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light for shadows and depth
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);
    }

    private setupControls() {
        // Key down handler
        window.addEventListener('keydown', (event) => {
            // Prevent default browser actions for game controls
            if (this.shouldPreventDefault(event.code)) {
                event.preventDefault();
            }
            
            this.updateControl(event.code, true);
        });

        // Key up handler
        window.addEventListener('keyup', (event) => {
            this.updateControl(event.code, false);
        });
    }

    private updateControl(code: string, isPressed: boolean) {
        switch (code) {
            case 'ArrowUp':
                this.controls.up = isPressed;
                break;
            case 'ArrowDown':
                this.controls.down = isPressed;
                break;
            case 'ArrowLeft':
                this.controls.left = isPressed;
                break;
            case 'ArrowRight':
                this.controls.right = isPressed;
                break;
            case 'KeyQ':
                this.controls.q = isPressed;
                break;
            case 'KeyW':
                this.controls.w = isPressed;
                break;
            case 'KeyE':
                this.controls.e = isPressed;
                break;
            case 'KeyA':
                this.controls.a = isPressed;
                break;
            case 'KeyS':
                this.controls.s = isPressed;
                break;
            case 'KeyD':
                this.controls.d = isPressed;
                break;
            case 'KeyZ':
                this.controls.z = isPressed;
                break;
            case 'KeyX':
                this.controls.x = isPressed;
                break;
            case 'KeyC':
                this.controls.c = isPressed;
                break;
            case 'Space':
                this.controls.space = isPressed;
                break;
        }
    }

    private shouldPreventDefault(code: string): boolean {
        return [
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Space'
        ].includes(code);
    }

    // Debug method to log control states
    private debugControls() {
        const activeControls = Object.entries(this.controls)
            .filter(([_, isPressed]) => isPressed)
            .map(([key]) => key)
            .join(', ');
        
        if (activeControls) {
            console.log('Active controls:', activeControls);
        }
    }

    private animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();

        // Update helicopter
        this.helicopter.update(this.controls, deltaTime);

        // Update camera to follow helicopter
        const targetX = this.helicopter.mesh.position.x;
        this.camera.position.x += (targetX - this.camera.position.x) * 0.1;

        // Debug: log active controls
        // this.debugControls();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    // Getter for controls - will be useful when we add entities that need control state
    public getControls(): Controls {
        return { ...this.controls };
    }
}

// Start the game
new Game();

