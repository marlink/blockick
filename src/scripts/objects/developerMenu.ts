/**
 * Mamba Kick Game - Working Version v0.2
 * Developer Menu UI Component
 */

import Phaser from 'phaser';
import VersionManager, { GameVersion } from '../utils/versionManager';

export default class DeveloperMenu extends Phaser.GameObjects.Container {
  private menuButton: Phaser.GameObjects.Container;
  private menuPanel: Phaser.GameObjects.Container;
  private isPanelOpen: boolean = false;
  private versionManager: VersionManager;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    // Fix the type error by using the scene's add method
    scene.add.existing(this as any);
    
    // Get the version manager instance
    this.versionManager = VersionManager.getInstance();
    
    // Create the menu button and panel
    this.menuButton = this.createMenuButton();
    this.menuPanel = this.createMenuPanel();
    
    // Add components to the container
    this.add(this.menuButton);
    this.add(this.menuPanel);
    
    // Initially hide the panel
    this.menuPanel.setVisible(false);
    
    // Set up interaction
    this.setupInteraction();
  }
  
  private createMenuButton(): Phaser.GameObjects.Container {
    const container = new Phaser.GameObjects.Container(this.scene as Phaser.Scene, 0, 0);
    
    // Create button background
    const bg = (this.scene as Phaser.Scene).add.rectangle(0, 0, 20, 20, 0x333333, 0.8);
    bg.setStrokeStyle(1, 0xffffff);
    
    // Create button text
    const text = (this.scene as Phaser.Scene).add.text(0, 0, 'D', {
      fontFamily: 'Arial',
      fontSize: '8px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Add to container
    container.add(bg);
    container.add(text);
    
    return container;
  }
  
  private createMenuPanel(): Phaser.GameObjects.Container {
    const container = new Phaser.GameObjects.Container(this.scene as Phaser.Scene, 0, -60);
    
    // Create panel background
    const bg = (this.scene as Phaser.Scene).add.rectangle(0, 0, 100, 60, 0x333333, 0.8);
    bg.setStrokeStyle(1, 0xffffff);
    
    // Get current version from version manager
    const currentVersion = this.versionManager.getCurrentVersion();
    const versionId = currentVersion ? currentVersion.id : 'v0.2';
    
    // Create version button
    const versionButton = this.createVersionButton(versionId, 0, -15);
    
    // Create reset button
    const resetButton = this.createActionButton('Reset', 0, 15, () => {
      this.resetGame();
    });
    
    // Add to container
    container.add(bg);
    container.add(versionButton);
    container.add(resetButton);
    
    return container;
  }
  
  private createVersionButton(version: string, x: number, y: number): Phaser.GameObjects.Container {
    return this.createActionButton(version, x, y, () => {
      // Toggle version dropdown
      this.toggleVersionDropdown();
    });
  }
  
  private toggleVersionDropdown(): void {
    // Check if dropdown already exists and remove it if it does
    const existingDropdown = this.getByName('versionDropdown') as Phaser.GameObjects.Container;
    if (existingDropdown) {
      existingDropdown.destroy();
      return;
    }
    
    // Create dropdown container
    const dropdown = new Phaser.GameObjects.Container(this.scene, 0, -120);
    dropdown.setName('versionDropdown');
    
    // Get all versions
    const versions = this.versionManager.getAllVersions();
    
    // Create dropdown background
    const height = versions.length * 20 + 10;
    const bg = this.scene.add.rectangle(0, 0, 100, height, 0x222222, 0.9);
    bg.setStrokeStyle(1, 0xffffff);
    
    dropdown.add(bg);
    
    // Add version options
    versions.forEach((version, index) => {
      const y = -height/2 + 15 + index * 20;
      const isActive = version.isActive;
      
      // Create option background
      const optionBg = this.scene.add.rectangle(0, y, 90, 18, isActive ? 0x005500 : 0x333333, 0.8);
      
      // Create option text
      const text = this.scene.add.text(0, y, version.id, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: isActive ? '#00ff00' : '#ffffff'
      }).setOrigin(0.5);
      
      // Make interactive
      optionBg.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.switchVersion(version.id);
          dropdown.destroy();
        })
        .on('pointerover', () => {
          optionBg.setFillStyle(0x555555, 0.8);
        })
        .on('pointerout', () => {
          optionBg.setFillStyle(isActive ? 0x005500 : 0x333333, 0.8);
        });
      
      dropdown.add(optionBg);
      dropdown.add(text);
    });
    
    // Add to main container
    this.add(dropdown);
  }
  
  private createActionButton(label: string, x: number, y: number, callback: Function): Phaser.GameObjects.Container {
    const container = new Phaser.GameObjects.Container(this.scene, x, y);
    
    // Create button background
    const bg = this.scene.add.rectangle(0, 0, 80, 20, 0x555555, 0.8);
    bg.setStrokeStyle(1, 0xffffff);
    
    // Create button text
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Make interactive
    bg.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        callback();
      })
      .on('pointerover', () => {
        bg.setFillStyle(0x777777, 0.8);
      })
      .on('pointerout', () => {
        bg.setFillStyle(0x555555, 0.8);
      });
    
    // Add to container
    container.add(bg);
    container.add(text);
    
    return container;
  }
  
  private setupInteraction(): void {
    // Make the menu button interactive
    const buttonBg = this.menuButton.getAt(0) as Phaser.GameObjects.Rectangle;
    
    buttonBg.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.togglePanel();
      })
      .on('pointerover', () => {
        buttonBg.setFillStyle(0x555555, 0.8);
      })
      .on('pointerout', () => {
        buttonBg.setFillStyle(0x333333, 0.8);
      });
  }
  
  private togglePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
    this.menuPanel.setVisible(this.isPanelOpen);
  }
  
  /**
   * Reset the game to its initial state
   */
  private resetGame(): void {
    // Get the SimpleShooterScene instance and call its resetGame method
    const gameScene = this.scene as any;
    if (gameScene.resetGame) {
      gameScene.resetGame();
    }
    
    // Close the panel after action
    this.togglePanel();
  }
  
  /**
   * Switch to a different game version
   * This will be implemented as part of the version control system
   */
  public switchVersion(versionId: string): boolean {
    const success = this.versionManager.switchVersion(versionId);
    if (success) {
      console.log(`Switched to version: ${versionId}`);
      
      // Update the version button
      const versionButton = this.menuPanel.getAt(1) as Phaser.GameObjects.Container;
      const versionText = versionButton.getAt(1) as Phaser.GameObjects.Text;
      versionText.setText(versionId);
      
      // Notify the scene about the version change
      if (this.scene['handleVersionChange'] && typeof this.scene['handleVersionChange'] === 'function') {
        this.scene['handleVersionChange'](versionId);
      }
    } else {
      console.warn(`Failed to switch to version: ${versionId}`);
    }
    return success;
  }
  
  /**
   * Add a new version to the version manager
   * This can be called from outside to register new versions
   */
  public addVersion(id: string, name: string, description?: string): void {
    if (!this.versionManager.hasVersion(id)) {
      this.versionManager.registerVersion({
        id,
        name,
        description,
        isActive: false
      });
      console.log(`Registered new version: ${id}`);
    }
  }
  
  /**
   * Add a new version button to the menu
   * This will be used when new versions are created
   */
  public addVersionButton(version: string): void {
    // This will be implemented later
    console.log(`Adding version button: ${version}`);
  }
}