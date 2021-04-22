import EntityTypeMap from "./EntityTypeMap";
interface EntityStoreWatcherConfig {
    entityStore: any;
    entityTypeMap: EntityTypeMap;
    policies: any;
}
/**
 * Watches the EntityStore for changes and performs side-effects to keep the EntityTypeMap synchronized with the data in the EntityStore.
 */
export default class EntityStoreWatcher {
    private config;
    private storeFunctions;
    constructor(config: EntityStoreWatcherConfig);
    private delete;
    private merge;
    private clear;
    private replace;
    private watch;
    private pause;
}
export {};
//# sourceMappingURL=EntityStoreWatcher.d.ts.map