/**
 * Mamba Kick Game - Working Version v0.2
 * Main game configuration and initialization
 */

import Phaser from 'phaser'
import MainScene from './scenes/mainScene'
import SimpleShooterScene from './scenes/simpleShooterScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#00FF00', // Green background
  width: 800,
  height: 600,
  scene: [SimpleShooterScene], // Use our new SimpleShooterScene
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // No gravity for our shooter
      debug: false
    }
  }
};

window.addEventListener('load', () => {
  const game = new Phaser.Game(config)

  // Register service worker for PWA support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.log('ServiceWorker registration failed:', error);
    });
  }
});
