# Mamba Kick Game - Version Control System

## Overview

This document describes the version control system implemented in Mamba Kick Game v0.2. The system allows for managing different versions of the game, switching between them, and providing a consistent way to label and track changes.

## Components

### 1. Version Manager

The core of the version control system is the `VersionManager` class located in `src/scripts/utils/versionManager.ts`. This singleton class manages all registered game versions and provides methods for:

- Registering new versions
- Getting all available versions
- Getting the current active version
- Switching between versions

### 2. Developer Menu

The `DeveloperMenu` class in `src/scripts/objects/developerMenu.ts` provides a user interface for interacting with the version control system. It includes:

- A dropdown menu to select and switch between versions
- A reset button to reset the game state
- Methods for adding new versions and handling version switching

### 3. Version Integration

The main game scene (`SimpleShooterScene`) integrates with the version control system by:

- Registering available versions (v0.1 and v0.2)
- Displaying the current version in the state text
- Implementing a `handleVersionChange` method to respond to version changes

## Version Labeling

All major files in the codebase include a version label comment at the top:

```typescript
/**
 * Mamba Kick Game - Working Version v0.2
 * [File description]
 */
```

This helps identify which version each file belongs to and provides a quick reference for developers.

## How to Use

### Switching Versions

1. Click the developer menu button in the bottom-right corner of the game
2. Click on the version button (e.g., "v0.2")
3. Select the desired version from the dropdown

### Adding a New Version

To add a new version to the system:

```typescript
// Get the version manager instance
const versionManager = VersionManager.getInstance();

// Register a new version
versionManager.registerVersion({
  id: 'v0.3',
  name: 'Version 0.3',
  description: 'Description of the new version',
  isActive: false
});
```

### Implementing Version-Specific Features

When implementing features that should behave differently across versions:

1. Use the `VersionManager` to check the current version
2. Implement conditional logic based on the version

Example:

```typescript
const versionManager = VersionManager.getInstance();
const currentVersion = versionManager.getCurrentVersion();

if (currentVersion && currentVersion.id === 'v0.2') {
  // Implement v0.2 specific behavior
} else {
  // Implement default behavior for other versions
}
```

## Future Improvements

- Implement a more robust version switching mechanism that can load different assets and code
- Add a version history view to the developer menu
- Implement automatic version detection based on feature flags
- Add the ability to save and load game state across version changes