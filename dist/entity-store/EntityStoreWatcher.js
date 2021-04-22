import { makeEntityId, isQuery } from "../helpers";
/**
 * Watches the EntityStore for changes and performs side-effects to keep the EntityTypeMap synchronized with the data in the EntityStore.
 */
var EntityStoreWatcher = /** @class */ (function () {
    function EntityStoreWatcher(config) {
        var _this = this;
        this.config = config;
        this.delete = function (dataId, fieldName, args) {
            var _a = _this.config, entityStore = _a.entityStore, entityTypeMap = _a.entityTypeMap, policies = _a.policies;
            var result = _this.storeFunctions.delete.call(entityStore, dataId, fieldName, args);
            var entity = entityTypeMap.readEntityById(makeEntityId(dataId, fieldName));
            var storeFieldName = fieldName && args
                ? policies.getStoreFieldName({
                    typename: entity ? entity.typename : undefined,
                    fieldName: fieldName,
                    args: args,
                })
                : undefined;
            entityTypeMap.evict(dataId, storeFieldName || fieldName);
            return result;
        };
        this.merge = function (dataId, incomingStoreObject) {
            var _a = _this.config, entityStore = _a.entityStore, entityTypeMap = _a.entityTypeMap;
            if (isQuery(dataId)) {
                Object.keys(incomingStoreObject)
                    .filter(function (storeFieldName) {
                    var _a;
                    // If there is a valid response, it will contain the type Query and then the nested response types for each requested field. We want
                    // to record a map of the types for those fields to their field store names. If there is no incoming data it is because that cache entry for storeFieldName
                    // is being deleted so do nothing
                    return storeFieldName !== "__typename" && ((_a = incomingStoreObject[storeFieldName]) === null || _a === void 0 ? void 0 : _a.__typename);
                })
                    .forEach(function (storeFieldName) {
                    var entityStoreObject = incomingStoreObject[storeFieldName];
                    entityTypeMap.write(entityStoreObject.__typename, dataId, storeFieldName);
                });
            }
            else {
                var typename = incomingStoreObject.__typename;
                // If the incoming data is empty, the dataId entry in the cache is being deleted so do nothing
                if (dataId && typename) {
                    entityTypeMap.write(typename, dataId);
                }
            }
            return _this.storeFunctions.merge.call(entityStore, dataId, incomingStoreObject);
        };
        this.clear = function () {
            var _a = _this, _b = _a.config, entityStore = _b.entityStore, entityTypeMap = _b.entityTypeMap, storeFunctions = _a.storeFunctions;
            entityTypeMap.clear();
            storeFunctions.clear.call(entityStore);
        };
        this.replace = function (data) {
            var _a = _this, _b = _a.config, entityStore = _b.entityStore, entityTypeMap = _b.entityTypeMap, replace = _a.storeFunctions.replace;
            var invalidation = data === null || data === void 0 ? void 0 : data.invalidation;
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
            _this.pause();
            replace.call(entityStore, data);
            _this.watch();
        };
        var _a = this.config.entityStore, clear = _a.clear, deleteKey = _a.delete, merge = _a.merge, replace = _a.replace;
        this.storeFunctions = {
            clear: clear,
            delete: deleteKey,
            merge: merge,
            replace: replace,
        };
        this.watch();
    }
    EntityStoreWatcher.prototype.watch = function () {
        var entityStore = this.config.entityStore;
        entityStore.clear = this.clear;
        entityStore.delete = this.delete;
        entityStore.merge = this.merge;
        entityStore.replace = this.replace;
    };
    EntityStoreWatcher.prototype.pause = function () {
        var entityStore = this.config.entityStore;
        var _a = this.storeFunctions, clear = _a.clear, deleteFunction = _a.delete, merge = _a.merge, replace = _a.replace;
        entityStore.clear = clear;
        entityStore.delete = deleteFunction;
        entityStore.merge = merge;
        entityStore.replace = replace;
    };
    return EntityStoreWatcher;
}());
export default EntityStoreWatcher;
//# sourceMappingURL=EntityStoreWatcher.js.map