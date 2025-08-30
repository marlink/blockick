import Phaser from 'phaser'
import FpsText from '../objects/fpsText'
import SimpleShooterScene from './simpleShooterScene'
import DeveloperMenu from '../objects/developerMenu'
import VersionManager from '../utils/versionManager'

export default class MainScene extends Phaser.Scene {
  fpsText: FpsText;
  developerMenu: DeveloperMenu;
  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    // Load assets here
  }

  create() {
    // Register v0.2 version for seamless switching
    this.registerV02Version();
    
    // Start the game scene
    this.scene.add('SimpleShooterScene', SimpleShooterScene, true);
    
    // Add FPS counter
    this.fpsText = new FpsText(this);
    
    // Add developer menu in the bottom right corner
    const { width, height } = this.cameras.main;
    this.developerMenu = new DeveloperMenu(this, width - 20, height - 20);
  }

  update() {
    this.fpsText.update();
  }
  
  /**
   * Register v0.2 version for seamless switching between versions
   */
  private registerV02Version(): void {
    const versionManager = VersionManager.getInstance();
    
    // Only register if it doesn't already exist
    if (!versionManager.hasVersion('v0.2')) {
      versionManager.registerVersion({
        id: 'v0.2',
        name: 'Version 0.2',
        description: 'Stable release with developer menu and version control',
        isActive: true
      });
      console.log('Registered v0.2 for seamless version switching');
    }
  }
}