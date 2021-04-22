"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
/**
 * Watches the EntityStore for changes and performs side-effects to keep the EntityTypeMap synchronized with the data in the EntityStore.
 */
class EntityStoreWatcher {
    constructor(config) {
        this.config = config;
        this.delete = (dataId, fieldName, args) => {
            const { entityStore, entityTypeMap, policies } = this.config;
            const result = this.storeFunctions.delete.call(entityStore, dataId, fieldName, args);
            const entity = entityTypeMap.readEntityById(helpers_1.makeEntityId(dataId, fieldName));
            const storeFieldName = fieldName && args
                ? policies.getStoreFieldName({
                    typename: entity ? entity.typename : undefined,
                    fieldName,
                    args,
                })
                : undefined;
            entityTypeMap.evict(dataId, storeFieldName || fieldName);
            return result;
        };
        this.merge = (dataId, incomingStoreObject) => {
            const { entityStore, entityTypeMap } = this.config;
            if (helpers_1.isQuery(dataId)) {
                Object.keys(incomingStoreObject)
                    .filter((storeFieldName) => {
                    var _a;
                    // If there is a valid response, it will contain the type Query and then the nested response types for each requested field. We want
                    // to record a map of the types for those fields to their field store names. If there is no incoming data it is because that cache entry for storeFieldName
                    // is being deleted so do nothing
                    return storeFieldName !== "__typename" && ((_a = incomingStoreObject[storeFieldName]) === null || _a === void 0 ? void 0 : _a.__typename);
                })
                    .forEach((storeFieldName) => {
                    const entityStoreObject = incomingStoreObject[storeFieldName];
                    entityTypeMap.write(entityStoreObject.__typename, dataId, storeFieldName);
                });
            }
            else {
                const typename = incomingStoreObject.__typename;
                // If the incoming data is empty, the dataId entry in the cache is being deleted so do nothing
                if (dataId && typename) {
                    entityTypeMap.write(typename, dataId);
                }
            }
            return this.storeFunctions.merge.call(entityStore, dataId, incomingStoreObject);
        };
        this.clear = () => {
            const { config: { entityStore, entityTypeMap }, storeFunctions, } = this;
            entityTypeMap.clear();
            storeFunctions.clear.call(entityStore);
        };
        this.replace = (data) => {
            const { config: { entityStore, entityTypeMap }, storeFunctions: { replace }, } = this;
            const invalidation = data === null || data === void 0 ? void 0 : data.invalidation;
            if (!data || !invalidation) {
                replace.call(entityStore, data);
                return;
            }
            delete data.invalidation;
            entityTypeMap.restore(invalidation.entitiesById);
            // The entity type map has already been restored and the store watcher
            // does not need to run for the merges triggered by replacing the entity store.
            // Those writes would also clobber any TTLs in the entity type map from the replaced data
            // so instead we pause the store watcher until the entity store data has been replaced.
            this.pause();
            replace.call(entityStore, data);
            this.watch();
        };
        const { entityStore: { clear, delete: deleteKey, merge, replace }, } = this.config;
        this.storeFunctions = {
            clear,
            delete: deleteKey,
            merge,
            replace,
        };
        this.watch();
    }
    watch() {
        const { entityStore } = this.config;
        entityStore.clear = this.clear;
        entityStore.delete = this.delete;
        entityStore.merge = this.merge;
        entityStore.replace = this.replace;
    }
    pause() {
        const { entityStore } = this.config;
        const { clear, delete: deleteFunction, merge, replace, } = this.storeFunctions;
        entityStore.clear = clear;
        entityStore.delete = deleteFunction;
        entityStore.merge = merge;
        entityStore.replace = replace;
    }
}
exports.default = EntityStoreWatcher;
//# sourceMappingURL=EntityStoreWatcher.js.map