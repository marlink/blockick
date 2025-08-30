/**
 * Mamba Kick Game - Working Version v0.2
 * Obstacle class for creating destructible blocks
 */

import Phaser from 'phaser';

export default class Obstacle extends Phaser.GameObjects.Container {
  private blocks: Phaser.GameObjects.Rectangle[] = [];
  private blockGroup: Phaser.Physics.Arcade.Group;
  private blockWidth: number = 40;
  private blockHeight: number = 20;
  private blockSpacing: number = 2;
  private rows: number = 4;
  private columns: number = 3;
  private destroyedBlocks: number = 0;
  private totalBlocks: number = this.rows * this.columns;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    
    // Create physics group for blocks
    this.blockGroup = scene.physics.add.group({
      immovable: true,
      allowGravity: false
    });
    
    // Create the grid of blocks
    this.createBlocks();
  }
  
  private createBlocks() {
    // Create a 3x4 grid of blocks
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        // Calculate position
        const blockX = col * (this.blockWidth + this.blockSpacing);
        const blockY = row * (this.blockHeight + this.blockSpacing);
        
        // Create block with random color
        const color = Phaser.Display.Color.RandomRGB().color;
        const block = this.scene.add.rectangle(
          blockX,
          blockY,
          this.blockWidth,
          this.blockHeight,
          color
        );
        
        // Add to container
        this.add(block);
        
        // Add to physics group
        this.blockGroup.add(block);
        
        // Store reference
        this.blocks.push(block);
      }
    }
  }
  
  public getBlockGroup(): Phaser.Physics.Arcade.Group {
    return this.blockGroup;
  }
  
  /**
   * Get the current number of blocks
   */
  public getBlockCount(): number {
    return this.blocks.length;
  }
  
  public destroyBlock(block: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
    // Find the block in our array
    const blockObj = block as unknown as Phaser.GameObjects.Rectangle;
    const index = this.blocks.indexOf(blockObj);
    if (index !== -1) {
      // Create particle effect
      this.createDestroyParticles(block);
      
      // Remove from arrays
      this.blocks.splice(index, 1);
      
      // Destroy the block
      block.destroy();
      
      // Increment destroyed count
      this.destroyedBlocks++;
      
      // Return true if this was a valid block
      return true;
    }
    
    return false;
  }
  
  private createDestroyParticles(block: Phaser.Types.Physics.Arcade.GameObjectWithBody) {
    // Get world position of the block
    const blockObj = block as unknown as Phaser.GameObjects.Rectangle;
    const worldX = this.x + blockObj.x;
    const worldY = this.y + blockObj.y;
    
    // Create particle emitter for block destruction
    const particles = this.scene.add.particles(worldX, worldY, 'particle', {
      frame: 'white',
      color: [0xffffff], // Use white color that can be tinted
      colorEase: 'quad.out',
      lifespan: 800,
      speed: { min: 50, max: 150 },
      scale: { start: 0.6, end: 0 },
      gravityY: 200,
      blendMode: 'ADD',
      emitting: false
    });
    
    // Emit particles in an explosion pattern
    particles.explode(20, worldX, worldY);
    
    // Destroy the emitter after animation completes
    this.scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }
  
  public isCompleted(): boolean {
    return this.destroyedBlocks >= this.totalBlocks;
  }
  
  public getDestroyedCount(): number {
    return this.destroyedBlocks;
  }
  
  public getTotalBlocks(): number {
    return this.totalBlocks;
  }
}