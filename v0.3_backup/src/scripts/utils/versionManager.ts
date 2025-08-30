/**
 * Mamba Kick Game - Working Version v0.2
 * Version Manager for handling multiple game versions
 */

export interface GameVersion {
  id: string;        // Version identifier (e.g., 'v0.1', 'v0.2')
  name: string;      // Display name
  description?: string; // Optional description
  isActive: boolean; // Whether this version is currently active
}

export default class VersionManager {
  private static instance: VersionManager;
  private versions: Map<string, GameVersion> = new Map();
  private currentVersion: string = 'v0.2'; // Default to v0.2
  
  // Private constructor for singleton pattern
  private constructor() {
    // Initialize with v0.2
    this.registerVersion({
      id: 'v0.2',
      name: 'Version 0.2',
      description: 'Stable release with developer menu and version control',
      isActive: true
    });
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager();
    }
    return VersionManager.instance;
  }
  
  /**
   * Register a new game version
   */
  public registerVersion(version: GameVersion): void {
    this.versions.set(version.id, version);
  }
  
  /**
   * Get all registered versions
   */
  public getAllVersions(): GameVersion[] {
    return Array.from(this.versions.values());
  }
  
  /**
   * Get the current active version
   */
  public getCurrentVersion(): GameVersion | undefined {
    return this.versions.get(this.currentVersion);
  }
  
  /**
   * Switch to a different version
   * Returns true if successful, false if version not found
   */
  public switchVersion(versionId: string): boolean {
    if (!this.versions.has(versionId)) {
      return false;
    }
    
    // Update active status
    const oldVersion = this.versions.get(this.currentVersion);
    if (oldVersion) {
      oldVersion.isActive = false;
      this.versions.set(this.currentVersion, oldVersion);
    }
    
    const newVersion = this.versions.get(versionId);
    if (newVersion) {
      newVersion.isActive = true;
      this.versions.set(versionId, newVersion);
    }
    
    this.currentVersion = versionId;
    return true;
  }
  
  /**
   * Check if a version exists
   */
  public hasVersion(versionId: string): boolean {
    return this.versions.has(versionId);
  }
}