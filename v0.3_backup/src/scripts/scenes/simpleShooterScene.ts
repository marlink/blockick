/**
 * Mamba Kick Game - Working Version v0.2
 * Main game scene with shooting mechanics
 */

import Phaser from 'phaser';
import Obstacle from '../objects/obstacle';
import DeveloperMenu from '../objects/developerMenu';
import VersionManager from '../utils/versionManager';
import { AtlasGrassTexture } from '../systems/atlasGrassTexture';
import { resourceManager } from '../systems/resourceManager';
import { performanceMonitor } from '../utils/performanceMonitor';
import { memoryOptimizer } from '../utils/memoryOptimizer';
import { errorHandler, ErrorSeverity } from '../utils/errorHandler';

enum GameState {
  IDLE,
  DIRECTION_SELECTION,
  STRENGTH_SELECTION,
  FIRING,
  WIN
}

export default class SimpleShooterScene extends Phaser.Scene {
  // Game state
  private gameState: GameState = GameState.IDLE;
  
  // Direction and strength tracking
  private lockedDirectionX: number = 0;
  private lockedDirectionY: number = 0;
  
  // Obstacle system
  private obstacle!: Obstacle;
  private winText!: Phaser.GameObjects.Text;
  
  // Visual components
  private circleOutline!: Phaser.GameObjects.Arc;
  private orbitingDot!: Phaser.GameObjects.Arc;
  private strengthIndicator!: Phaser.GameObjects.Arc;
  private directionLine!: Phaser.GameObjects.Line;
  private stateText!: Phaser.GameObjects.Text;
  private projectiles!: Phaser.Physics.Arcade.Group;
  
  // Developer menu
  private developerMenu!: DeveloperMenu;
  
  // Atlas Grass Texture System (Solution 2)
  private atlasGrassTexture!: AtlasGrassTexture;
  
  // World boundaries for collision
  private worldBounds!: Phaser.Physics.Arcade.StaticGroup;
  
  // Input
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private lastSpacebarPressTime: number = 0;
  private spacebarCooldown: number = 250; // Cooldown in ms to prevent rapid presses
  private strengthSelectionStartTime: number = 0; // When strength selection began
  private inputBuffer: boolean = false; // Buffer for queued spacebar presses
  
  // Orbit parameters
  private orbitRadius: number = 40;
  private orbitSpeed: number = 120; // degrees per second
  private orbitAngle: number = 0; // current angle of the orbiting dot
  private orbitDirection: number = 1; // 1 for clockwise, -1 for counter-clockwise
  
  // Strength indicator parameters
  private baseStrengthPulseSpeed: number = 1.5; // Base speed in full cycles per second
  private currentStrengthPulseSpeed: number = 1.5; // Current speed (increases over time)
  private pulseAccelerationRate: number = 0.2; // How quickly the pulse speed increases per second
  private maxPulseSpeed: number = 3.0; // Maximum pulse speed in cycles per second
  private strengthPulseTime: number = 0;
  private minStrengthRadius: number = 10;
  private maxStrengthRadius: number = this.orbitRadius - 5;
  private currentStrengthRadius: number = this.minStrengthRadius;
  private currentStrength: number = 0; // 0 to 1 value representing strength
  
  constructor() {
    super({ key: 'SimpleShooterScene' });
  }
  
  async preload() {
    try {
      // Initialize performance monitoring
      performanceMonitor.startMonitoring();
      
      // Pre-load critical resources
      await resourceManager.preloadCriticalAssets(this);
      
      // Load particle texture for block destruction
      this.load.image('particle', 'assets/particle.svg');
      
      // Initialize Atlas Grass Texture system
         this.atlasGrassTexture = new AtlasGrassTexture(this);
         await this.atlasGrassTexture.preload();
      
      console.log('✅ All assets preloaded successfully');
      
    } catch (error) {
      await errorHandler.handleError(
        error as Error,
        ErrorSeverity.HIGH,
        'scene_preload',
        { scene: 'SimpleShooterScene' },
        'atlas_texture_load'
      );
    }
  }
  
  async create() {
    // Register version v0.1 for demonstration purposes
    const versionManager = VersionManager.getInstance();
    versionManager.registerVersion({
      id: 'v0.1',
      name: 'Version 0.1',
      description: 'Initial version with basic shooting mechanics',
      isActive: false
    });
    
    // Create Atlas Grass Texture background (Solution 2)
      await this.createAtlasGrassBackground();
    
    // Create projectile group with physics
    this.projectiles = this.physics.add.group({
      bounceX: 0.8,
      bounceY: 0.8,
      collideWorldBounds: false // We'll handle custom bounds
    });
    
    // Set up keyboard input
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Create visual components
    this.createVisualComponents();
    
    // Create world boundaries
    this.createWorldBoundaries();
    
    // Create obstacle
    this.createObstacle();
    
    // Create win text (initially hidden)
    this.createWinText();
    
    // Add one-time key down event for spacebar
    this.input.keyboard.on('keydown-SPACE', this.handleSpacebarPress, this);
    
    // Developer menu removed - version switcher moved to HTML
  }
  
  private createWorldBoundaries() {
    // Create static group for world boundaries
    this.worldBounds = this.physics.add.staticGroup();
    
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const thickness = 50; // Thickness of the boundary
    
    // Create invisible boundary objects
    // Top boundary
    const topBoundary = this.add.rectangle(width/2, -thickness/2, width, thickness, 0xFF0000, 0);
    this.worldBounds.add(topBoundary);
    
    // Bottom boundary
    const bottomBoundary = this.add.rectangle(width/2, height + thickness/2, width, thickness, 0xFF0000, 0);
    this.worldBounds.add(bottomBoundary);
    
    // Left boundary
    const leftBoundary = this.add.rectangle(-thickness/2, height/2, thickness, height, 0xFF0000, 0);
    this.worldBounds.add(leftBoundary);
    
    // Right boundary
    const rightBoundary = this.add.rectangle(width + thickness/2, height/2, thickness, height, 0xFF0000, 0);
    this.worldBounds.add(rightBoundary);
    
    // Set up collision between projectiles and world boundaries
     this.physics.add.collider(this.projectiles, this.worldBounds, this.handleProjectileBounce as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback, undefined, this);
  }
  
  private createVisualComponents() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height - 100; // Position at bottom center
    
    // Create circle outline (stroke only, no fill)
    this.circleOutline = this.add.circle(centerX, centerY, this.orbitRadius, 0xFFFFFF, 0);
    this.circleOutline.setStrokeStyle(2, 0xFFFFFF); // White outline
    this.circleOutline.setVisible(false);
    
    // Create orbiting dot (initially invisible)
    this.orbitingDot = this.add.circle(centerX, centerY - this.orbitRadius, 4, 0xFFFFFF);
    this.orbitingDot.setVisible(false);
    
    // Create strength indicator (pulsating ring)
    this.strengthIndicator = this.add.circle(centerX, centerY, this.minStrengthRadius, 0x00FFFF, 0);
    this.strengthIndicator.setStrokeStyle(2, 0x00FFFF); // Cyan outline
    this.strengthIndicator.setVisible(false);
    
    // Create the direction line (initially invisible)
    this.directionLine = this.add.line(0, 0, centerX, centerY, centerX, centerY, 0xFFFFFF);
    this.directionLine.setLineWidth(2);
    this.directionLine.setVisible(false);
    
    // Create state text indicator
    this.stateText = this.add.text(10, 10, 'State: IDLE', { 
      fontFamily: 'Arial', 
      fontSize: '16px',
      color: '#FFFFFF'
    });
    this.updateStateText();
  }
  
  private createWinText() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    
    this.winText = this.add.text(centerX, centerY, 'Well done!', {
      color: '#FFFFFF',
      fontSize: '48px',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.winText.setVisible(false);
  }
  
  private createObstacle() {
    const width = this.cameras.main.width;
    
    // Randomly choose position (left, center, or right)
    const positions = [
      width * 0.25,  // Left
      width * 0.5,   // Center
      width * 0.75   // Right
    ];
    
    const randomPosition = Phaser.Math.RND.pick(positions);
    
    // Create obstacle at the top of the screen
    this.obstacle = new Obstacle(this, randomPosition, 30);
    
    // Set up collision between projectiles and obstacle blocks
    this.physics.add.collider(
      this.projectiles,
      this.obstacle.getBlockGroup(),
      (projectile, block) => {
        // Cast to the correct types
        this.handleProjectileBlockCollision(
          projectile as Phaser.Types.Physics.Arcade.GameObjectWithBody,
          block as Phaser.Types.Physics.Arcade.GameObjectWithBody
        );
        return false; // Don't destroy the projectile
      },
      undefined,
      this
    );
  }
  
  update(time: number, delta: number) {
    // Update atlas grass texture for wind animation
    if (this.atlasGrassTexture) {
      this.atlasGrassTexture.update(time, delta);
    }

    // Update orbiting dot position when in direction selection mode
    if (this.gameState === GameState.DIRECTION_SELECTION) {
      this.updateOrbitingDot(delta);
    }
    
    // Update strength indicator when in strength selection mode
    if (this.gameState === GameState.STRENGTH_SELECTION) {
      this.updateStrengthIndicator(delta);
      
      // Fail-safe: If strength selection has been active for too long (5 seconds),
      // automatically fire with current strength to prevent getting stuck
      const elapsedTime = (time - this.strengthSelectionStartTime);
      if (elapsedTime > 5000) { // 5 seconds max for strength selection
        this.lockStrengthAndFire();
      }
    }
    
    // Check win condition
    if (this.obstacle && this.obstacle.isCompleted() && this.gameState !== GameState.WIN) {
      this.handleWin();
    }
    
    // Update projectiles
    this.updateProjectiles(delta);
    
    // Process input buffer if we're in a state that can accept input
    // and enough time has passed since the last spacebar press
    if (this.inputBuffer && 
        (time - this.lastSpacebarPressTime) >= this.spacebarCooldown && 
        (this.gameState === GameState.IDLE || 
         this.gameState === GameState.DIRECTION_SELECTION || 
         this.gameState === GameState.STRENGTH_SELECTION)) {
      this.handleSpacebarPress();
    }
    
    // Fail-safe: Check if any UI elements are in inconsistent states
    this.validateGameState();
  }
  
  private updateProjectiles(delta: number) {
    const projectiles = this.projectiles.getChildren();
    const dragFactor = 0.99; // Velocity decay factor (0.99 = 1% slowdown per frame, adjusted for 3x velocities)
    
    for (let i = 0; i < projectiles.length; i++) {
      const projectile = projectiles[i] as Phaser.GameObjects.Arc;
      const body = projectile.body as Phaser.Physics.Arcade.Body;
      
      // Apply velocity decay
      body.velocity.x *= dragFactor;
      body.velocity.y *= dragFactor;
      
      // Check if projectile has nearly stopped
      const speed = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
      if (speed < 20) { // Adjusted from 50 to 20 to match the 3x velocity increase
        // Projectile has stopped, start fade out
        if (!projectile.data || !projectile.data.get('fading')) {
          this.startProjectileFadeOut(projectile);
        }
      }
      
      // Check if projectile is off screen (failsafe)
      if (projectile.y < -50 || projectile.y > this.cameras.main.height + 50 ||
          projectile.x < -50 || projectile.x > this.cameras.main.width + 50) {
        projectile.destroy();
      }
    }
  }
  
  private updateStrengthIndicator(delta: number) {
    // Calculate elapsed time since strength selection started (in seconds)
    const elapsedTime = (this.time.now - this.strengthSelectionStartTime) / 1000;
    
    // Accelerate the pulse speed over time, capped at maximum
    this.currentStrengthPulseSpeed = Math.min(
      this.baseStrengthPulseSpeed + (this.pulseAccelerationRate * elapsedTime),
      this.maxPulseSpeed
    );
    
    // Update pulse time
    this.strengthPulseTime += delta / 1000;
    
    // Calculate current radius using sine wave for smooth pulsation
    const pulsePhase = Math.sin(this.strengthPulseTime * Math.PI * this.currentStrengthPulseSpeed);
    
    // Convert from -1,1 range to 0,1 range
    const normalizedPulse = (pulsePhase + 1) / 2;
    
    // Calculate radius between min and max
    this.currentStrengthRadius = this.minStrengthRadius + normalizedPulse * (this.maxStrengthRadius - this.minStrengthRadius);
    this.currentStrength = normalizedPulse; // Store current strength value
    
    // Update indicator size
    this.strengthIndicator.setRadius(this.currentStrengthRadius);
    
    // Update color based on strength (green to red gradient)
    const colorValue = this.getStrengthColor(normalizedPulse);
    this.strengthIndicator.setStrokeStyle(2, colorValue);
  }
  
  private getStrengthColor(strength: number): number {
    // Create a color gradient from green (low strength) to yellow (medium) to red (high strength)
    if (strength < 0.5) {
      // Green to yellow gradient (0x00FF00 to 0xFFFF00)
      const r = Math.floor(255 * (strength * 2)); // 0 to 255
      const g = 255;
      const b = 0;
      return (r << 16) | (g << 8) | b;
    } else {
      // Yellow to red gradient (0xFFFF00 to 0xFF0000)
      const r = 255;
      const g = Math.floor(255 * (1 - (strength - 0.5) * 2)); // 255 to 0
      const b = 0;
      return (r << 16) | (g << 8) | b;
    }
  }
  
  private updateOrbitingDot(delta: number) {
    // Calculate rotation amount based on delta time for smooth animation
    const rotationAmount = (this.orbitSpeed * delta / 1000) * this.orbitDirection;
    
    // Update current angle
    this.orbitAngle += rotationAmount;
    
    // Keep angle within 0-180 degrees range (top semicircle only)
    if (this.orbitAngle > 180) {
      this.orbitAngle = 180;
      this.orbitDirection = -1; // Change direction to counter-clockwise
    } else if (this.orbitAngle < 0) {
      this.orbitAngle = 0;
      this.orbitDirection = 1; // Change direction to clockwise
    }
    
    // Calculate new position on the circle
    const centerX = this.circleOutline.x;
    const centerY = this.circleOutline.y;
    const angleRadians = Phaser.Math.DegToRad(this.orbitAngle);
    
    // In Phaser, 0 degrees is at 3 o'clock, so we need to adjust to make 0 at 9 o'clock and 180 at 3 o'clock
    // for the top semicircle
    const adjustedAngleRadians = Math.PI - angleRadians;
    
    // Calculate position on the circle
    const x = centerX + Math.cos(adjustedAngleRadians) * this.orbitRadius;
    const y = centerY - Math.sin(adjustedAngleRadians) * this.orbitRadius; // Subtract to go up from center
    
    // Update dot position
    this.orbitingDot.setPosition(x, y);
  }
  
  private handleSpacebarPress() {
    // Implement debounce to prevent rapid presses
    const currentTime = this.time.now;
    if (currentTime - this.lastSpacebarPressTime < this.spacebarCooldown) {
      // Queue the input for later processing if we're in a state that can accept input
      if (this.gameState === GameState.IDLE || 
          this.gameState === GameState.DIRECTION_SELECTION || 
          this.gameState === GameState.STRENGTH_SELECTION) {
        this.inputBuffer = true;
      }
      return;
    }
    
    // Update the last press time
    this.lastSpacebarPressTime = currentTime;
    this.inputBuffer = false; // Clear the buffer as we're processing this press
    
    // State machine for spacebar presses
    switch (this.gameState) {
      case GameState.IDLE:
        // First press: activate the system for direction selection
        this.activateDirectionSelection();
        break;
        
      case GameState.DIRECTION_SELECTION:
        // Second press: lock direction and start strength selection
        this.lockDirectionAndStartStrengthSelection();
        break;
        
      case GameState.STRENGTH_SELECTION:
        // Third press: lock strength and fire projectile
        this.lockStrengthAndFire();
        break;
        
      case GameState.FIRING:
        // Ignore additional presses while firing, but buffer it for when we return to IDLE
        this.inputBuffer = true;
        break;
        
      case GameState.WIN:
        // Ignore presses during win state
        break;
    }
  }
  
  private activateDirectionSelection() {
    // Change state to direction selection
    this.gameState = GameState.DIRECTION_SELECTION;
    this.updateStateText();
    
    // Reset orbit angle to start position (left side of semicircle)
    this.orbitAngle = 0;
    this.orbitDirection = 1; // Start moving clockwise
    
    // Make components visible
    this.circleOutline.setVisible(true);
    this.orbitingDot.setVisible(true);
    this.orbitingDot.fillColor = 0x00FFFF; // Cyan for active selection
    
    // Update dot position immediately
    this.updateOrbitingDot(0);
  }
  
  private lockDirectionAndStartStrengthSelection() {
    // Lock the current direction
    const centerX = this.circleOutline.x;
    const centerY = this.circleOutline.y;
    this.lockedDirectionX = this.orbitingDot.x - centerX;
    this.lockedDirectionY = this.orbitingDot.y - centerY;
    
    // Change state to strength selection
    this.gameState = GameState.STRENGTH_SELECTION;
    this.updateStateText();
    
    // Reset strength pulsation parameters and record the start time for strength selection
    this.strengthSelectionStartTime = this.time.now;
    this.currentStrengthPulseSpeed = this.baseStrengthPulseSpeed;
    this.strengthPulseTime = 0;
    this.currentStrengthRadius = this.minStrengthRadius;
    
    // Make strength indicator visible
    this.strengthIndicator.setVisible(true);
    
    // Set initial color (green for minimum strength)
    this.strengthIndicator.setStrokeStyle(2, 0x00FF00);
    
    // Update direction line to show locked direction
    this.directionLine.setTo(centerX, centerY, centerX + this.lockedDirectionX, centerY + this.lockedDirectionY);
    this.directionLine.setVisible(true);
    
    // Change orbiting dot color to indicate it's locked
    this.orbitingDot.fillColor = 0xFFFF00; // Yellow
  }
  
  private lockStrengthAndFire() {
    // Lock the current strength value
    const lockedStrength = this.currentStrength;
    
    // Get the center coordinates
    const centerX = this.circleOutline.x;
    const centerY = this.circleOutline.y;
    
    // Use the locked direction vector (set during direction locking)
    const directionX = this.lockedDirectionX;
    const directionY = this.lockedDirectionY;
    
    // Change state to firing
    this.gameState = GameState.FIRING;
    this.updateStateText();
    
    // Change strength indicator color to indicate firing
    this.strengthIndicator.fillColor = 0xFF0000; // Red
    
    // Fire projectile with the locked strength and direction
    this.fireProjectile(lockedStrength);
  }
  
  private fireProjectile(strength: number) {
    // Get the center coordinates
    const centerX = this.circleOutline.x;
    const centerY = this.circleOutline.y;
    
    // Use the locked direction vector (set during direction locking)
    const directionX = this.lockedDirectionX;
    const directionY = this.lockedDirectionY;
    
    // Normalize direction vector
    const length = Math.sqrt(directionX * directionX + directionY * directionY);
    const normalizedDirX = directionX / length;
    const normalizedDirY = directionY / length;
    
    // Create projectile at the position where the orbiting dot was locked
    const startX = centerX + directionX;
    const startY = centerY + directionY;
    const projectile = this.add.circle(startX, startY, 5, 0xFF0000);
    
    // Add to physics group and enable physics
    this.projectiles.add(projectile);
    this.physics.add.existing(projectile);
    
    // Set velocity based on direction and strength
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    const minSpeed = 50; // Reduced from 100 to ensure slower minimum speed
    const maxSpeed = 1500; // Increased by 3x from 500 to allow reaching the top of the screen
    const speed = minSpeed + strength * (maxSpeed - minSpeed);
    body.setVelocity(normalizedDirX * speed, normalizedDirY * speed);
    
    // Set up data for tracking bounce count
    projectile.setData('bounceCount', 0);
    projectile.setData('fading', false);
    projectile.setData('initialSpeed', speed);
    
    // Reset system after firing
    this.resetSystem();
  }
  
  private handleProjectileBounce(projectile: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, boundary: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
    // Get the game object from the physics body
    const projectileObj = projectile as unknown as Phaser.GameObjects.GameObject;
    
    // Increment bounce count
    const currentBounces = projectileObj.getData('bounceCount') || 0;
    projectileObj.setData('bounceCount', currentBounces + 1);
    
    // Reduce velocity on each bounce
    const body = (projectile as Phaser.Types.Physics.Arcade.GameObjectWithBody).body;
    const velocityReductionFactor = 0.82; // 18% velocity reduction per bounce (adjusted for 3x velocities)
    body.velocity.x *= velocityReductionFactor;
    body.velocity.y *= velocityReductionFactor;
    
    // Check if max bounce count reached
    if (currentBounces + 1 >= 4) { // Allow 3-4 bounces as specified
      // Start fade out if not already fading
      if (!projectileObj.getData('fading')) {
        this.startProjectileFadeOut(projectileObj as unknown as Phaser.GameObjects.Arc);
      }
    }
  }
  
  private startProjectileFadeOut(projectile: Phaser.GameObjects.Arc) {
    // Mark projectile as fading
    projectile.setData('fading', true);
    
    // Create fade out tween
    this.tweens.add({
      targets: projectile,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        projectile.destroy();
        
        // If no projectiles left, allow starting a new sequence
        if (this.projectiles.countActive() === 0) {
          this.gameState = GameState.IDLE;
        }
      }
    });
  }
  
  private resetSystem() {
    // Reset state to idle
    this.gameState = GameState.IDLE;
    this.updateStateText();
    
    // Hide components
    this.circleOutline.setVisible(false);
    this.orbitingDot.setVisible(false);
    this.strengthIndicator.setVisible(false);
    this.directionLine.setVisible(false);
    
    // Reset timing variables and input buffer
    this.lastSpacebarPressTime = 0;
    this.strengthSelectionStartTime = 0;
    this.strengthPulseTime = 0;
    this.inputBuffer = false;
  }
  
  /**
   * Public method to reset the game
   * This can be called from the developer menu
   */
  public resetGame() {
    // Clear any active projectiles
    this.projectiles.clear(true, true);
    
    // Reset the game state
    this.resetSystem();
    
    // Recreate the obstacle if it's empty
    if (this.obstacle.getBlockCount() === 0) {
      this.obstacle.destroy();
      this.createObstacle();
    }
  }
  
  /**
   * Handle version switching
   * This method will be called when switching between game versions
   */
  public handleVersionChange(versionId: string): void {
    console.log(`Scene handling version change to: ${versionId}`);
    
    // Reset the game when switching versions
    this.resetGame();
    
    // In a more complex implementation, this would load version-specific
    // assets, game mechanics, or other changes
    
    // For now, we just update the state text to show the current version
    if (this.stateText) {
      this.updateStateText();
    }
  }
  
  private updateStateText() {
    let stateString = 'IDLE';
    
    switch (this.gameState) {
      case GameState.IDLE:
        stateString = 'IDLE - Press SPACE to start';
        break;
      case GameState.DIRECTION_SELECTION:
        stateString = 'SELECT DIRECTION - Press SPACE to lock';
        break;
      case GameState.STRENGTH_SELECTION:
        stateString = 'SELECT STRENGTH - Press SPACE to fire';
        break;
      case GameState.FIRING:
        stateString = 'FIRING';
        break;
      case GameState.WIN:
        stateString = 'YOU WIN!';
        break;
    }
    
    // Get current version
    const versionManager = VersionManager.getInstance();
    const currentVersion = versionManager.getCurrentVersion();
    const versionId = currentVersion ? currentVersion.id : 'unknown';
    
    this.stateText.setText(`State: ${stateString} (${versionId})`);
  }
  
  private handleProjectileBlockCollision(projectile: Phaser.Types.Physics.Arcade.GameObjectWithBody, block: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
    // Destroy the block but not the projectile
    this.obstacle.destroyBlock(block);
    
    // No need to destroy the projectile - it will continue bouncing
    return false; // Return false to prevent the projectile from being destroyed
  }
  
  private handleWin() {
    // Set game state to WIN
    this.gameState = GameState.WIN;
    this.updateStateText();
    
    // Show win text
    this.winText.setVisible(true);
    
    // Hide other UI elements
    this.stateText.setVisible(false);
    this.directionLine.setVisible(false);
    this.strengthIndicator.setVisible(false);
    this.circleOutline.setVisible(false);
    this.orbitingDot.setVisible(false);
    
    // Reset the game after a delay
    this.time.delayedCall(3000, () => {
      // Destroy old obstacle
      if (this.obstacle) {
        this.obstacle.destroy();
      }
      
      // Create new obstacle
      this.createObstacle();
      
      // Reset game state
      this.resetSystem();
      
      // Show state text again
      this.stateText.setVisible(true);
      this.winText.setVisible(false);
    });
  }
  
  /**
   * Create Atlas Grass Texture background using Solution 2
   */
  private async createAtlasGrassBackground(): Promise<void> {
    const startTime = performance.now();
    
    try {
      performanceMonitor.recordMetric('grass_background_creation_start', startTime);
      
      // Check if atlas grass texture is properly initialized
      if (!this.atlasGrassTexture) {
        console.warn('⚠️ AtlasGrassTexture not initialized, falling back to simple background');
        this.cameras.main.setBackgroundColor('#4a7c59');
        return;
      }
      
      // Create the atlas grass texture background
      this.atlasGrassTexture.create();
      
      const creationTime = performance.now() - startTime;
      performanceMonitor.recordMetric('grass_background_creation_time', creationTime);
      
      console.log(`✅ Atlas grass background created in ${creationTime.toFixed(2)}ms`);
      
    } catch (error) {
      await errorHandler.handleError(
        error as Error,
        ErrorSeverity.MEDIUM,
        'grass_background_creation',
        { 
          scene: 'SimpleShooterScene',
          creationTime: performance.now() - startTime
        },
        'fallback_background'
      );
      
      // Fallback to simple background
      this.cameras.main.setBackgroundColor('#4a7c59');
    }
  }
  
  /**
   * Validates the current game state and fixes any inconsistencies
   * This acts as a fail-safe to prevent the game from getting stuck
   */
  private validateGameState() {
    // Check for inconsistent states
    const currentTime = this.time.now;
    
    // Case 1: If in DIRECTION_SELECTION for too long (10 seconds), reset
    if (this.gameState === GameState.DIRECTION_SELECTION) {
      if (currentTime - this.lastSpacebarPressTime > 10000) {
        console.log('Direction selection timeout - resetting');
        this.resetSystem();
        return;
      }
    }
    
    // Case 2: If in FIRING state but no active projectiles, reset to IDLE
    if (this.gameState === GameState.FIRING && this.projectiles.countActive() === 0) {
      console.log('No active projectiles in FIRING state - resetting');
      this.resetSystem();
      return;
    }
    
    // Case 3: Check for visual inconsistencies
    if (this.gameState === GameState.IDLE) {
      // In IDLE state, all UI elements should be hidden
      if (this.circleOutline.visible || this.orbitingDot.visible || 
          this.strengthIndicator.visible || this.directionLine.visible) {
        console.log('Visual inconsistency in IDLE state - fixing');
        this.circleOutline.setVisible(false);
        this.orbitingDot.setVisible(false);
        this.strengthIndicator.setVisible(false);
        this.directionLine.setVisible(false);
      }
    }
  }
}
