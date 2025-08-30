# Version Switching Documentation

## Overview

This document explains how to switch between v0.2 and v0.3 versions of the Mamba Kick game. The version switching mechanism has been implemented to ensure seamless transitions between the stable v0.2 version and the development v0.3 version.

## Version Structure

- **v0.2 (Stable Version)**
  - Location: `/Users/ciepolml/Projects/mamba-kick/v02/v0.2_revert`
  - Features: Core game functionality, developer menu, version control system
  - Status: Fully functional and stable

- **v0.3 (Development Version)**
  - Location: `/Users/ciepolml/Projects/mamba-kick/v02/v0.3_backup`
  - Features: All v0.2 features plus grass feature implementation
  - Status: Preserved for future development

## How to Switch Versions

### Using the Developer Menu

1. Launch the game using `npm start` in either the v0.2_revert or v0.3_backup directory
2. Click on the "D" button in the bottom right corner to open the developer menu
3. Click on the version button (displays current version, e.g., "v0.2")
4. Select the desired version from the dropdown menu

### Implementation Details

Version switching is handled by the `VersionManager` class, which maintains a registry of available versions and their active status. The `DeveloperMenu` class provides the UI for switching between versions.

Both v0.2 and v0.3 have been configured to register each other, ensuring that users can seamlessly switch between them:

- v0.2 registers v0.3 in its `mainScene.ts`
- v0.3 registers v0.2 in its `mainScene.ts`

## Development Guidelines

### Adding Features to v0.2

When adding features to the stable v0.2 version:

1. Make changes in the v0.2_revert directory
2. Test thoroughly to ensure stability
3. Port the changes to v0.3_backup to maintain consistency

### Adding Features to v0.3

When continuing development on the v0.3 version:

1. Make changes in the v0.3_backup directory
2. Use version-specific code to ensure compatibility with v0.2
3. Test switching between versions to verify functionality

### Version-Specific Code

To implement version-specific features, use the `VersionManager` to check the current version:

```typescript
const versionManager = VersionManager.getInstance();
const currentVersion = versionManager.getCurrentVersion();

if (currentVersion && currentVersion.id === 'v0.3') {
  // Implement v0.3-specific features here
}
```

## Troubleshooting

If you encounter issues with version switching:

1. Check the browser console for error messages
2. Verify that both versions are properly registered in their respective `mainScene.ts` files
3. Ensure that version-specific code is properly conditioned on the current version
4. Restart the development server if necessary

## Future Development

As development continues, maintain clear separation between versions while ensuring compatibility. When adding new versions:

1. Register the new version in the `VersionManager`
2. Update existing versions to recognize the new version
3. Document version-specific features and compatibility considerations