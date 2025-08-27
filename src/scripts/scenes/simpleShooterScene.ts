import Phaser from 'phaser';

enum GameState {
  IDLE,
  ACTIVE,
  FIRING
}

export default class SimpleShooterScene extends Phaser.Scene {
  // Game state
  private gameState: GameState = GameState.IDLE;
  
  // Visual components
  private circleOutline!: Phaser.GameObjects.Arc;
  private orbitingDot!: Phaser.GameObjects.Arc;
  private projectiles!: Phaser.Physics.Arcade.Group;
  
  // Input
  private spaceKey!: Phaser.Input.Keyboard.Key;
  
  // Orbit parameters
  private orbitRadius: number = 40;
  private orbitSpeed: number = 120; // degrees per second
  private orbitAngle: number = 0; // current angle of the orbiting dot
  private orbitDirection: number = 1; // 1 for clockwise, -1 for counter-clockwise
  
  constructor() {
    super({ key: 'SimpleShooterScene' });
  }
  
  create() {
    // Set background color
    this.cameras.main.setBackgroundColor('#00FF00');
    
    // Create projectile group with physics
    this.projectiles = this.physics.add.group();
    
    // Set up keyboard input
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Create visual components
    this.createVisualComponents();
    
    // Add one-time key down event for spacebar
    this.input.keyboard.on('keydown-SPACE', this.handleSpacebarPress, this);
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
  }
  
  update(time: number, delta: number) {
    // Update orbiting dot position when active
    if (this.gameState === GameState.ACTIVE) {
      this.updateOrbitingDot(delta);
    }
    
    // Remove projectiles that go off screen
    const projectiles = this.projectiles.getChildren();
    for (let i = 0; i < projectiles.length; i++) {
      const projectile = projectiles[i] as Phaser.GameObjects.Arc;
      if (projectile.y < -20 || projectile.y > this.cameras.main.height + 20 ||
          projectile.x < -20 || projectile.x > this.cameras.main.width + 20) {
        projectile.destroy();
      }
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
        // Second press: fire projectile
        this.fireProjectile();
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
  
  private fireProjectile() {
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
    
    // Set velocity based on direction
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    const speed = 300;
    body.setVelocity(normalizedDirX * speed, normalizedDirY * speed);
    
    // Reset system after firing
    this.resetSystem();
  }
  
  private resetSystem() {
    // Reset state to idle
    this.gameState = GameState.IDLE;
    
    // Hide components
    this.circleOutline.setVisible(false);
    this.orbitingDot.setVisible(false);
  }
}
