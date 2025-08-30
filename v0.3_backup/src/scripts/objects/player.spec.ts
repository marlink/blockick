import Player from './player';

// Mock Phaser global object
jest.mock('phaser', () => ({
  GameObjects: {
    Sprite: class {
      constructor() {}
      setCollideWorldBounds = jest.fn().mockReturnThis()
      setBounce = jest.fn().mockReturnThis()
    }
  },
  Scene: class {},
  Physics: {
    Arcade: {
      Sprite: class {}
    }
  }
}));

describe('Player', () => {
  it('should initialize correctly', () => {
    const scene = {
      add: {
        existing: jest.fn()
      },
      physics: {
        add: {
          existing: jest.fn()
        }
      }
    };
    const player = new Player(scene as any, 100, 100);
    expect(player).toBeDefined();
  });
});