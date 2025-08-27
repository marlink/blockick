import Phaser from 'phaser';

enum AimingState {
  IDLE,
  AIMING,
  LOCKED,
  FIRING
}

export default class SimpleShooterScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private lastFired: number = 0;
  private fireRate: number = 200; // milliseconds between shots
  
  // Aiming system components
  private aimingState: AimingState = AimingState.IDLE;
  private aimingCircle!: Phaser.GameObjects.Arc;
  private aimingArrow!: Phaser.GameObjects.Triangle;
  private directionIndicator!: Phaser.GameObjects.Arc; // Small circle at arrow tip
  private vertexMarkers!: Phaser.GameObjects.Arc[]; // Array of markers for triangle vertices
  private currentRotation: number = 0;
  private rotationDirection: number = 1; // 1 for clockwise, -1 for counter-clockwise
  private rotationSpeed: number = 100; // degrees per second
  private lockedDirection: number = 0;
  private firingTimer!: Phaser.Time.TimerEvent;
  
  constructor() {
    super({ key: 'SimpleShooterScene' });
  }
  
  create() {
    // Set background color to green
    this.cameras.main.setBackgroundColor('#00FF00');
    
    // Create player block at bottom center
    this.player = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height - 50,
      50,
      30,
      0x0000FF
    );
    
    // Set up physics for player
    this.physics.add.existing(this.player, false);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setCollideWorldBounds(true);
    
    // Create projectile group with physics
    this.projectiles = this.physics.add.group();
    
    // Set up keyboard inputs
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    
    // Initialize aiming components (initially invisible)
    this.createAimingComponents();
    
    // Add one-time key down event for spacebar
    this.input.keyboard.on('keydown-SPACE', this.handleSpacebarPress, this);
  }
  
  private createAimingComponents() {
    // Create aiming circle (initially invisible)
    this.aimingCircle = this.add.circle(0, 0, 40, 0xFFFFFF, 0.5);
    this.aimingCircle.setVisible(false);
    
    // Create aiming arrow (initially invisible)
    // Triangle vertices: (0, -30) is top, (-10, 0) is bottom-left, (10, 0) is bottom-right
    this.aimingArrow = this.add.triangle(0, 0, 0, -30, -10, 0, 10, 0, 0xFF0000);
    this.aimingArrow.setVisible(false);
    
    // Create direction indicator at arrow tip (initially invisible)
    this.directionIndicator = this.add.circle(0, 0, 5, 0x00FFFF, 0.8);
    this.directionIndicator.setVisible(false);

    // Create vertex markers (initially invisible)
    // Marker 1 (top vertex) - yellow
    const marker1 = this.add.circle(0, 0, 3, 0xFFFF00, 1);
    marker1.setVisible(false);
    
    // Marker 2 (bottom left vertex) - green
    const marker2 = this.add.circle(0, 0, 3, 0x00FF00, 1);
    marker2.setVisible(false);
    
    // Marker 3 (bottom right vertex) - purple
    const marker3 = this.add.circle(0, 0, 3, 0xAA00FF, 1);
    marker3.setVisible(false);
    
    this.vertexMarkers = [marker1, marker2, marker3];
  }
  
  update(time: number, delta: number) {
    // Handle player movement
    this.handlePlayerMovement();
    
    // Handle aiming rotation when in AIMING state
    if (this.aimingState === AimingState.AIMING) {
      this.updateAimingRotation(delta);
    }
    
    // Update positions of aiming components to follow player
    if (this.aimingState !== AimingState.IDLE) {
      this.updateAimingComponentPositions();
    }
    
    // Handle regular firing (when not using aiming system)
    if (this.aimingState === AimingState.IDLE && this.fireKey.isDown && time > this.lastFired) {
      this.fireProjectile(90); // Default upward direction (90 degrees)
      this.lastFired = time + this.fireRate;
    }
    
    // Remove projectiles that go off screen
    const projectiles = this.projectiles.getChildren();
    for (let i = 0; i < projectiles.length; i++) {
      const projectile = projectiles[i] as Phaser.GameObjects.Rectangle;
      if (projectile.y < -20 || projectile.y > this.cameras.main.height + 20 ||
          projectile.x < -20 || projectile.x > this.cameras.main.width + 20) {
        projectile.destroy();
      }
    }
  }
  
  private handlePlayerMovement() {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    
    // Reset velocity
    playerBody.setVelocityX(0);
    
    // Handle left/right movement
    if (this.leftKey.isDown) {
      playerBody.setVelocityX(-200);
    } else if (this.rightKey.isDown) {
      playerBody.setVelocityX(200);
    }
  }
  
  private updateAimingRotation(delta: number) {
    // Calculate rotation amount based on delta time for smooth animation
    const rotationAmount = (this.rotationSpeed * delta / 1000) * this.rotationDirection;
    
    // Update current rotation
    this.currentRotation += rotationAmount;
    
    // Keep rotation within 90-270 degrees range (12 o'clock to 6 o'clock, passing through 0/360°)
    // Note: In Phaser, 0/360 is at 3 o'clock, 90 is at 12 o'clock, 180 is at 9 o'clock, 270 is at 6 o'clock
    if (this.currentRotation > 270) {
      this.currentRotation = 270;
      this.rotationDirection = -1; // Change direction to counter-clockwise
    } else if (this.currentRotation < 90) {
      this.currentRotation = 90;
      this.rotationDirection = 1; // Change direction to clockwise
    }
    
    // If we're in the upper half (90-270), adjust to pass through 0/360 instead of 180
    if (this.currentRotation >= 90 && this.currentRotation <= 270) {
      // Map 90-270 to 90-0-270 (passing through 0/360 at the top of the circle)
      let mappedRotation;
      if (this.currentRotation < 180) {
        // Map 90-180 to 90-0
        mappedRotation = 90 - (this.currentRotation - 90) * (90 / 90);
      } else {
        // Map 180-270 to 360-270
        mappedRotation = 360 - (this.currentRotation - 180) * (90 / 90);
      }
      
      // Apply the mapped rotation to the arrow
      const radians = Phaser.Math.DegToRad(mappedRotation);
      this.aimingArrow.setRotation(radians);
      return; // Skip the normal rotation application below
    }
    
    // Apply rotation to arrow (convert to radians)
    const radians = Phaser.Math.DegToRad(this.currentRotation);
    this.aimingArrow.setRotation(radians);
  }
  
  private updateAimingComponentPositions() {
    // Position aiming components at player's position
    const baseX = this.player.x;
    const baseY = this.player.y - 20;
    
    // Set base positions
    this.aimingCircle.setPosition(baseX, baseY);
    this.aimingArrow.setPosition(baseX, baseY);
    
    // Calculate indicator position based on current rotation
    const radians = Phaser.Math.DegToRad(this.currentRotation);
    // Position the indicator exactly at the top vertex of the triangle
    // Original top vertex is at (0, -30)
    const topX = 0;
    const topY = -30;
    const rotatedTopX = topX * Math.cos(radians) - topY * Math.sin(radians);
    const rotatedTopY = topX * Math.sin(radians) + topY * Math.cos(radians);
    const indicatorX = baseX + rotatedTopX;
    const indicatorY = baseY + rotatedTopY;
    
    // Update vertex marker positions
    if (this.aimingArrow.visible) {
      // Make markers visible
      this.vertexMarkers.forEach(marker => marker.setVisible(true));
      
      // Calculate vertex positions based on triangle's actual vertices and current rotation
      // Original triangle vertices: (0, -30), (-10, 0), (10, 0)
      // We need to rotate these points and position them relative to the base position
      
      // Marker 1 (top vertex) - yellow - original position (0, -30)
      const topX = 0;
      const topY = -30;
      const rotatedTopX = topX * Math.cos(radians) - topY * Math.sin(radians);
      const rotatedTopY = topX * Math.sin(radians) + topY * Math.cos(radians);
      this.vertexMarkers[0].setPosition(baseX + rotatedTopX, baseY + rotatedTopY);
      
      // Marker 2 (bottom left vertex) - green - original position (-10, 0)
      const leftX = -10;
      const leftY = 0;
      const rotatedLeftX = leftX * Math.cos(radians) - leftY * Math.sin(radians);
      const rotatedLeftY = leftX * Math.sin(radians) + leftY * Math.cos(radians);
      this.vertexMarkers[1].setPosition(baseX + rotatedLeftX, baseY + rotatedLeftY);
      
      // Marker 3 (bottom right vertex) - purple - original position (10, 0)
      const rightX = 10;
      const rightY = 0;
      const rotatedRightX = rightX * Math.cos(radians) - rightY * Math.sin(radians);
      const rotatedRightY = rightX * Math.sin(radians) + rightY * Math.cos(radians);
      this.vertexMarkers[2].setPosition(baseX + rotatedRightX, baseY + rotatedRightY);
    } else {
      // Hide markers when arrow is not visible
      this.vertexMarkers.forEach(marker => marker.setVisible(false));
    }
    
    // Update indicator position
    this.directionIndicator.setPosition(indicatorX, indicatorY);
  }
  
  private handleSpacebarPress() {
    // State machine for spacebar presses
    switch (this.aimingState) {
      case AimingState.IDLE:
        // First press: activate aiming mode
        this.activateAimingMode();
        break;
        
      case AimingState.AIMING:
        // Second press: lock direction and prepare to fire
        this.lockAimingDirection();
        break;
        
      case AimingState.LOCKED:
      case AimingState.FIRING:
        // Ignore additional presses while locked or firing
        break;
    }
  }
  
  private activateAimingMode() {
    // Change state to aiming
    this.aimingState = AimingState.AIMING;
    
    // Reset rotation to starting position (6 o'clock position)
    this.currentRotation = 270;
    this.rotationDirection = -1; // Start moving in opposite direction (counter-clockwise)
    
    // Make aiming components visible
    this.aimingCircle.setVisible(true);
    this.aimingArrow.setVisible(true);
    this.directionIndicator.setVisible(true);
    
    // Position at player
    this.updateAimingComponentPositions();
  }
  
  private lockAimingDirection() {
    // Change state to locked
    this.aimingState = AimingState.LOCKED;
    
    // Store the locked direction
    this.lockedDirection = this.currentRotation;
    
    // Visual feedback for locked state
    this.aimingCircle.setFillStyle(0xFFAA00, 0.7); // Change color to orange
    
    // Schedule firing after 500ms (0.5 seconds)
    this.firingTimer = this.time.delayedCall(500, this.fireLockedProjectile, [], this);
  }
  
  private fireLockedProjectile() {
    // Change state to firing
    this.aimingState = AimingState.FIRING;
    
    // Fire projectile in the locked direction
    this.fireProjectile(this.lockedDirection);
    
    // Reset aiming system after firing
    this.resetAimingSystem();
  }
  
  private resetAimingSystem() {
    // Reset state to idle
    this.aimingState = AimingState.IDLE;
    
    // Hide aiming components
    this.aimingCircle.setVisible(false);
    this.aimingArrow.setVisible(false);
    this.directionIndicator.setVisible(false);
    
    // Reset circle color
    this.aimingCircle.setFillStyle(0xFFFFFF, 0.5);
  }
  
  private fireProjectile(angleDegrees: number) {
    // Convert angle from degrees to radians
    const angleRadians = Phaser.Math.DegToRad(angleDegrees);
    
    // Calculate velocity components based on angle
    // Note: 90 degrees is straight up, 0 is right, 180 is left
    const velocityX = Math.sin(angleRadians) * 300; // Positive sin to go in the direction of the blue indicator
    const velocityY = Math.cos(angleRadians) * 300; // Positive cos to go in the direction of the blue indicator
    
    // Create projectile at player position
    const projectile = this.add.rectangle(
      this.player.x,
      this.player.y - 20,
      10,
      20,
      0xFF0000
    );
    
    // Rotate projectile to match firing angle
    projectile.setRotation(angleRadians);
    
    // Add to physics group and enable physics
    this.projectiles.add(projectile);
    this.physics.add.existing(projectile);
    
    // Set velocity based on angle
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(velocityX, velocityY);
    
    // Add visual feedback (muzzle flash)
    this.addMuzzleFlash(angleDegrees);
  }
  
  private addMuzzleFlash(angleDegrees: number) {
    // Convert angle from degrees to radians
    const angleRadians = Phaser.Math.DegToRad(angleDegrees);
    
    // Calculate position offset for the flash based on angle
    const offsetX = Math.sin(angleRadians) * 20; // Offset in direction of firing
    const offsetY = Math.cos(angleRadians) * 20; // Offset in direction of firing
    
    // Create flash effect
    const flash = this.add.rectangle(
      this.player.x + offsetX,
      this.player.y - 20 + offsetY,
      20,
      10,
      0xFFFF00
    );
    
    // Rotate flash to match firing angle
    flash.setRotation(angleRadians);
    
    // Fade out and destroy
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy()
    });
  }
}
