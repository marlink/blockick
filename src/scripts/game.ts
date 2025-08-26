// Clean starter: minimal game entry
import 'phaser';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: { preload: () => {}, create: () => {}, update: () => {} }
};

new Phaser.Game(config);

