import MainScene from './mainScene'

// Mock Phaser global object
jest.mock('phaser', () => ({
  Scene: class {
    constructor() {}
    add = {
      text: jest.fn().mockReturnThis(),
      setOrigin: jest.fn().mockReturnThis()
    }
    physics = {
      add: {
        sprite: jest.fn().mockReturnThis()
      }
    }
  }
}));

describe('MainScene', () => {
  it('should initialize correctly', () => {
    const scene = new MainScene()
    expect(scene).toBeDefined()
  })
})