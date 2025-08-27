import Phaser from 'phaser';

enum GameState {
  IDLE,
  ACTIVE,
  STRENGTH_SELECTION,
  FIRING
}

export default class SimpleShooterScene extends Phaser.Scene {
  // Game state
  private gameState: GameState = GameState.IDLE;
  
  // Visual components
  private circleOutline!: Phaser.GameObjects.Arc;
  private orbitingDot!: Phaser.GameObjects.Arc;
  private strengthIndicator!: Phaser.GameObjects.Arc;
  private projectiles!: Phaser.Physics.Arcade.Group;
  
  // World boundaries for collision
  private worldBounds!: Phaser.Physics.Arcade.StaticGroup;
  
  // Input
  private spaceKey!: Phaser.Input.Keyboard.Key;
  
  // Orbit parameters
  private orbitRadius: number = 40;
  private orbitSpeed: number = 120; // degrees per second
  private orbitAngle: number = 0; // current angle of the orbiting dot
  private orbitDirection: number = 1; // 1 for clockwise, -1 for counter-clockwise
  
  // Strength indicator parameters
  private strengthPulseSpeed: number = 1.5; // full cycles per second
  private strengthPulseTime: number = 0;
  private minStrengthRadius: number = 10;
  private maxStrengthRadius: number = this.orbitRadius - 5;
  private currentStrengthRadius: number = this.minStrengthRadius;
  private currentStrength: number = 0; // 0 to 1 value representing strength
  
  constructor() {
    super({ key: 'SimpleShooterScene' });
  }
  
  create() {
    // Set background color
    this.cameras.main.setBackgroundColor('#00FF00');
    
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
    
    // Add one-time key down event for spacebar
    this.input.keyboard.on('keydown-SPACE', this.handleSpacebarPress, this);
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
  }
  
  update(time: number, delta: number) {
    // Update orbiting dot position when active
    if (this.gameState === GameState.ACTIVE || this.gameState === GameState.STRENGTH_SELECTION) {
      this.updateOrbitingDot(delta);
    }
    
    // Update strength indicator when in strength selection mode
    if (this.gameState === GameState.STRENGTH_SELECTION) {
      this.updateStrengthIndicator(delta);
    }
    
    // Update projectiles
    this.updateProjectiles(delta);
  }
  
  private updateProjectiles(delta: number) {
    const projectiles = this.projectiles.getChildren();
    const dragFactor = 0.98; // Velocity decay factor (0.98 = 2% slowdown per frame)
    
    for (let i = 0; i < projectiles.length; i++) {
      const projectile = projectiles[i] as Phaser.GameObjects.Arc;
      const body = projectile.body as Phaser.Physics.Arcade.Body;
      
      // Apply velocity decay
      body.velocity.x *= dragFactor;
      body.velocity.y *= dragFactor;
      
      // Check if projectile has nearly stopped
      const speed = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
      if (speed < 10) {
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
    // Update pulse time
    this.strengthPulseTime += delta / 1000;
    
    // Calculate current radius using sine wave for smooth pulsation
    const pulsePhase = Math.sin(this.strengthPulseTime * Math.PI * this.strengthPulseSpeed);
    
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
    // State machine for spacebar presses
    switch (this.gameState) {
      case GameState.IDLE:
        // First press: activate the system
        this.activateSystem();
        break;
        
      case GameState.ACTIVE:
        // Second press: start strength selection
        this.startStrengthSelection();
        break;
        
      case GameState.STRENGTH_SELECTION:
        // Third press: lock strength and fire projectile
        this.lockStrengthAndFire();
        break;
        
      case GameState.FIRING:
        // Ignore additional presses while firing
        break;
    }
  }
  
  private activateSystem() {
    // Change state to active
    this.gameState = GameState.ACTIVE;
    
    // Reset orbit angle to start position (left side of semicircle)
    this.orbitAngle = 0;
    this.orbitDirection = 1; // Start moving clockwise
    
    // Make components visible
    this.circleOutline.setVisible(true);
    this.orbitingDot.setVisible(true);
    
    // Update dot position immediately
    this.updateOrbitingDot(0);
  }
  
  private startStrengthSelection() {
    // Change state to strength selection
    this.gameState = GameState.STRENGTH_SELECTION;
    
    // Reset strength pulse time
    this.strengthPulseTime = 0;
    this.currentStrengthRadius = this.minStrengthRadius;
    
    // Make strength indicator visible
    this.strengthIndicator.setVisible(true);
    
    // Set initial color (green for minimum strength)
    this.strengthIndicator.setStrokeStyle(2, 0x00FF00);
  }
  
  private lockStrengthAndFire() {
    // Lock the current strength value
    const lockedStrength = this.currentStrength;
    
    // Fire projectile with the locked strength
    this.fireProjectile(lockedStrength);
  }
  
  private fireProjectile(strength: number) {
    // Change state to firing
    this.gameState = GameState.FIRING;
    
    // Get current position of the orbiting dot
    const startX = this.orbitingDot.x;
    const startY = this.orbitingDot.y;
    
    // Calculate direction from circle center to dot
    const centerX = this.circleOutline.x;
    const centerY = this.circleOutline.y;
    const directionX = startX - centerX;
    const directionY = startY - centerY;
    
    // Normalize direction vector
    const length = Math.sqrt(directionX * directionX + directionY * directionY);
    const normalizedDirX = directionX / length;
    const normalizedDirY = directionY / length;
    
    // Create projectile at dot position
    const projectile = this.add.circle(startX, startY, 5, 0xFF0000);
    
    // Add to physics group and enable physics
    this.projectiles.add(projectile);
    this.physics.add.existing(projectile);
    
    // Set velocity based on direction and strength
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    const minSpeed = 100;
    const maxSpeed = 500;
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
    const velocityReductionFactor = 0.8; // 20% velocity reduction per bounce
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
    
    // Hide components
    this.circleOutline.setVisible(false);
    this.orbitingDot.setVisible(false);
    this.strengthIndicator.setVisible(false);
  }
}
