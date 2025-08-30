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
    // Register v0.3 version for seamless switching
    this.registerV03Version();
    
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
   * Register v0.3 version for seamless switching between versions
   */
  private registerV03Version(): void {
    const versionManager = VersionManager.getInstance();
    
    // Only register if it doesn't already exist
    if (!versionManager.hasVersion('v0.3')) {
      versionManager.registerVersion({
        id: 'v0.3',
        name: 'Version 0.3',
        description: 'Development version with grass feature implementation',
        isActive: false
      });
      console.log('Registered v0.3 for seamless version switching');
    }
  }
}