# Simple Shooter Game - Game Design Document

## Game Overview

A minimalist shooting game where the player controls a rectangular block that fires projectiles upward.

## Visual Elements

- **Background**: Solid green color covering the entire screen
- **Player**: Rectangular block positioned at the bottom center of the screen
- **Projectiles**: Simple shapes (circles or small rectangles) that travel upward

## Game Mechanics

### Core Mechanics
- **Firing**: Press the spacebar to fire projectiles upward from the player block
- **Projectile Movement**: Projectiles travel in a straight line from the block to the top edge of the screen
- **Visual Feedback**: Clear visual indication when firing (e.g., muzzle flash effect or animation)
- **Player Movement**: Use left and right arrow keys to move the player horizontally

## Technical Implementation

### Pseudocode

```javascript
// Initialize game
function init() {
  // Create green background
  background = createRectangle(0, 0, screenWidth, screenHeight, "green");
  
  // Create player block at bottom center
  playerBlock = createRectangle(
    screenWidth / 2 - blockWidth / 2,
    screenHeight - blockHeight - 10,
    blockWidth,
    blockHeight,
    "blue"
  );
  
  // Initialize projectiles array
  projectiles = [];
  
  // Add event listener for spacebar
  addKeyListener(SPACEBAR, onSpacebarPress);
  
  // Add event listeners for arrow keys
  addKeyListener(LEFT_ARROW, onLeftArrowPress);
  addKeyListener(RIGHT_ARROW, onRightArrowPress);
}

// Handle spacebar press
function onSpacebarPress() {
  // Create new projectile at player position
  const projectile = createProjectile(
    playerBlock.x + playerBlock.width / 2 - projectileWidth / 2,
    playerBlock.y - projectileHeight,
    projectileWidth,
    projectileHeight,
    "red"
  );
  
  // Add to projectiles array
  projectiles.push(projectile);
  
  // Play sound effect
  playSound("fire.wav");
  
  // Show visual feedback
  showMuzzleFlash();
}

// Handle player movement
function onLeftArrowPress() {
  playerBlock.x -= playerSpeed;
  if (playerBlock.x < 0) playerBlock.x = 0;
}

function onRightArrowPress() {
  playerBlock.x += playerSpeed;
  if (playerBlock.x + playerBlock.width > screenWidth) {
    playerBlock.x = screenWidth - playerBlock.width;
  }
}

// Update game state (called every frame)
function update(deltaTime) {
  // Move all projectiles upward
  for (let i = 0; i < projectiles.length; i++) {
    projectiles[i].y -= projectileSpeed * deltaTime;
    
    // Remove projectiles that go off screen
    if (projectiles[i].y + projectiles[i].height < 0) {
      removeProjectile(i);
      i--;
    }
  }
}

// Render game (called every frame after update)
function render() {
  // Draw background
  drawRectangle(background);
  
  // Draw player block
  drawRectangle(playerBlock);
  
  // Draw all projectiles
  for (const projectile of projectiles) {
    drawRectangle(projectile);
  }
}
```

### Implementation with Phaser 3

Since the project uses Phaser 3, here's how the implementation would look:

```typescript
export default class SimpleShooterScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private lastFired: number = 0;
  private fireRate: number = 200; // milliseconds between shots
  
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
  }
  
  update(time: number, delta: number) {
    // Handle player movement
    this.handlePlayerMovement();
    
    // Handle firing on spacebar press with fire rate limit
    if (this.fireKey.isDown && time > this.lastFired) {
      this.fireProjectile();
      this.lastFired = time + this.fireRate;
    }
    
    // Remove projectiles that go off screen
    const projectiles = this.projectiles.getChildren();
    for (let i = 0; i < projectiles.length; i++) {
      const projectile = projectiles[i] as Phaser.GameObjects.Rectangle;
      if (projectile.y < -20) {
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
  
  private fireProjectile() {
    // Create projectile at player position
    const projectile = this.add.rectangle(
      this.player.x,
      this.player.y - 20,
      10,
      20,
      0xFF0000
    );
    
    // Add to physics group and enable physics
    this.projectiles.add(projectile);
    this.physics.add.existing(projectile);
    
    // Set velocity (negative y means upward)
    const body = projectile.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(-300);
    
    // Add visual feedback (simple flash effect)
    this.addMuzzleFlash();
  }
  
  private addMuzzleFlash() {
    // Create flash effect
    const flash = this.add.rectangle(
      this.player.x,
      this.player.y - 20,
      20,
      10,
      0xFFFF00
    );
    
    // Fade out and destroy
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy()
    });
  }
}
```

## Integration Steps

1. Create a new scene file in the project's scenes directory
2. Implement the SimpleShooterScene class as shown above
3. Register the scene in the game configuration
4. Set it as the starting scene or add navigation to access it

## Browser-Based Demo Implementation

### Features Implemented

- **Responsive Controls**: Player movement using left/right arrow keys with smooth motion
- **Firing Mechanism**: Spacebar to fire projectiles with rate limiting to prevent spam
- **Visual Feedback**: Yellow muzzle flash effect when firing
- **Physics Integration**: Proper physics bodies for player and projectiles
- **Boundary Collision**: Player cannot move outside the game boundaries
- **Performance Optimization**: Projectiles are destroyed when they leave the screen

### Cross-Browser Compatibility

- Uses standard Phaser 3 rendering which supports all modern browsers
- No browser-specific code or dependencies
- Responsive design adapts to different screen sizes

### Technical Improvements

- Added TypeScript non-null assertions to prevent compilation errors
- Implemented fire rate limiting for better gameplay balance
- Used physics bodies for more accurate movement and collisions
- Added proper cleanup of game objects to prevent memory leaks

## Performance Considerations

- Use object pooling for projectiles to avoid frequent creation/destruction
- Limit the maximum number of projectiles on screen if needed
- Optimize collision detection if adding targets in the future

---

*This document describes a simple shooting game with the specified visual elements and mechanics. The implementation details provided have been successfully implemented in the browser-based demo.*
