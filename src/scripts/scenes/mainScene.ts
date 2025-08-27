import Phaser from 'phaser'

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    // Load assets here
  }

  create() {
    // Create game objects here
    this.add.text(400, 300, 'Mamba Kick Game', {
      color: '#ffffff'
    }).setOrigin(0.5)
  }

  update() {
    // Game logic here
  }
}