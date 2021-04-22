"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const core_1 = require("@apollo/client/core");
const InvalidationPolicyManager_1 = __importDefault(require("../policies/InvalidationPolicyManager"));
const entity_store_1 = require("../entity-store");
const helpers_1 = require("../helpers");
const CacheResultProcessor_1 = require("./CacheResultProcessor");
const types_1 = require("../policies/types");
/**
 * Extension of Apollo in-memory cache which adds support for invalidation policies.
 */
class InvalidationPolicyCache extends core_1.InMemoryCache {
    constructor(config = {}) {
        const { invalidationPolicies = {} } = config, inMemoryCacheConfig = __rest(config, ["invalidationPolicies"]);
        super(inMemoryCacheConfig);
        // @ts-ignore
        this.entityStoreRoot = this.data;
        this.isBroadcasting = false;
        this.entityTypeMap = new entity_store_1.EntityTypeMap();
        new entity_store_1.EntityStoreWatcher({
            entityStore: this.entityStoreRoot,
            entityTypeMap: this.entityTypeMap,
            policies: this.policies,
        });
        this.invalidationPolicyManager = new InvalidationPolicyManager_1.default({
            policies: invalidationPolicies,
            entityTypeMap: this.entityTypeMap,
            cacheOperations: {
                evict: (...args) => this.evict(...args),
                modify: (...args) => this.modify(...args),
                readField: (...args) => this.readField(...args),
            },
        });
        this.cacheResultProcessor = new CacheResultProcessor_1.CacheResultProcessor({
            invalidationPolicyManager: this.invalidationPolicyManager,
            entityTypeMap: this.entityTypeMap,
            cache: this,
        });
    }
    readField(fieldNameOrOptions, from) {
        if (!fieldNameOrOptions) {
            return;
        }
        const options = typeof fieldNameOrOptions === "string"
            ? {
                fieldName: fieldNameOrOptions,
                from,
            }
            : fieldNameOrOptions;
        if (void 0 === options.from) {
            options.from = { __ref: 'ROOT_QUERY' };
        }
        return this.policies.readField(options, {
            store: this.entityStoreRoot,
        });
    }
    broadcastWatches() {
        this.isBroadcasting = true;
        super.broadcastWatches();
        this.isBroadcasting = false;
    }
    // Determines whether the cache's data reference is set to the root store. If not, then there is an ongoing optimistic transaction
    // being applied to a new layer.
    isOperatingOnRootData() {
        // @ts-ignore
        return this.data === this.entityStoreRoot;
    }
    modify(options) {
        var _a;
        const modifyResult = super.modify(options);
        if (!this.invalidationPolicyManager.isPolicyEventActive(types_1.InvalidationPolicyEvent.Write) ||
            !modifyResult) {
            return modifyResult;
        }
        const { id = "ROOT_QUERY", fields } = options;
        if (helpers_1.isQuery(id)) {
            Object.keys(fields).forEach((storeFieldName) => {
                var _a;
                const fieldName = helpers_1.fieldNameFromStoreName(storeFieldName);
                const typename = (_a = this.entityTypeMap.readEntityById(helpers_1.makeEntityId(id, fieldName))) === null || _a === void 0 ? void 0 : _a.typename;
                if (!typename) {
                    return;
                }
                this.invalidationPolicyManager.runWritePolicy(typename, {
                    parent: {
                        id,
                        fieldName,
                        storeFieldName,
                        ref: core_1.makeReference(id),
                    },
                });
            });
        }
        else {
            const typename = (_a = this.entityTypeMap.readEntityById(id)) === null || _a === void 0 ? void 0 : _a.typename;
            if (!typename) {
                return modifyResult;
            }
            this.invalidationPolicyManager.runWritePolicy(typename, {
                parent: {
                    id,
                    ref: core_1.makeReference(id),
                },
            });
        }
        if (options.broadcast) {
            this.broadcastWatches();
        }
        return modifyResult;
    }
    write(options) {
        const writeResult = super.write(options);
        // Do not trigger a write policy if the current write is being applied to an optimistic data layer since
        // the policy will later be applied when the server data response is received.
        if ((!this.invalidationPolicyManager.isPolicyEventActive(types_1.InvalidationPolicyEvent.Write) &&
            !this.invalidationPolicyManager.isPolicyEventActive(types_1.InvalidationPolicyEvent.Read)) ||
            !this.isOperatingOnRootData()) {
            return writeResult;
        }
        this.cacheResultProcessor.processWriteResult(options);
        if (options.broadcast) {
            this.broadcastWatches();
        }
        return writeResult;
    }
    evict(options) {
        var _a;
        const { fieldName, args } = options;
        let { id } = options;
        if (!id) {
            if (Object.prototype.hasOwnProperty.call(options, "id")) {
                return false;
            }
            id = "ROOT_QUERY";
        }
        if (this.invalidationPolicyManager.isPolicyEventActive(types_1.InvalidationPolicyEvent.Evict)) {
            const { typename } = (_a = this.entityTypeMap.readEntityById(helpers_1.makeEntityId(id, fieldName))) !== null && _a !== void 0 ? _a : {};
            if (typename) {
                const storeFieldName = helpers_1.isQuery(id) && fieldName
                    ? this.policies.getStoreFieldName({
                        typename,
                        fieldName,
                        args,
                    })
                    : undefined;
                this.invalidationPolicyManager.runEvictPolicy(typename, {
                    parent: {
                        id,
                        fieldName,
                        storeFieldName,
                        variables: args,
                        ref: core_1.makeReference(id),
                    },
                });
            }
        }
        return super.evict(options);
    }
    // Returns all expired entities whose cache time exceeds their type's timeToLive or as a fallback
    // the global timeToLive if specified. Evicts the expired entities by default, with an option to only report
    // them.
    _expire(reportOnly = false) {
        const { entitiesById } = this.entityTypeMap.extract();
        const expiredEntityIds = [];
        Object.keys(entitiesById).forEach((entityId) => {
            const entity = entitiesById[entityId];
            const { storeFieldNames, dataId, fieldName, typename } = entity;
            if (helpers_1.isQuery(dataId) && storeFieldNames) {
                Object.keys(storeFieldNames.entries).forEach((storeFieldName) => {
                    const isExpired = this.invalidationPolicyManager.runReadPolicy({
                        typename,
                        dataId,
                        fieldName,
                        storeFieldName,
                        reportOnly,
                    });
                    if (isExpired) {
                        expiredEntityIds.push(helpers_1.makeEntityId(dataId, storeFieldName));
                    }
                });
            }
            else {
                const isExpired = this.invalidationPolicyManager.runReadPolicy({
                    typename,
                    dataId,
                    fieldName,
                    reportOnly,
                });
                if (isExpired) {
                    expiredEntityIds.push(helpers_1.makeEntityId(dataId));
                }
            }
        });
        if (expiredEntityIds.length > 0) {
            this.broadcastWatches();
        }
        return expiredEntityIds;
    }
    // Expires all entities still present in the cache that have exceeded their timeToLive. By default entities are evicted
    // lazily on read if their entity is expired. Use this expire API to eagerly remove expired entities.
    expire() {
        return this._expire(false);
    }
    // Returns all expired entities still present in the cache.
    expiredEntities() {
        return this._expire(true);
    }
    // Activates the provided policy events (on read, on write, on evict) or by default all policy events.
    activatePolicyEvents(...policyEvents) {
        if (policyEvents.length > 0) {
            this.invalidationPolicyManager.activatePolicies(...policyEvents);
        }
        else {
            this.invalidationPolicyManager.activatePolicies(types_1.InvalidationPolicyEvent.Read, types_1.InvalidationPolicyEvent.Write, types_1.InvalidationPolicyEvent.Evict);
        }
    }
    // Deactivates the provided policy events (on read, on write, on evict) or by default all policy events.
    deactivatePolicyEvents(...policyEvents) {
        if (policyEvents.length > 0) {
            this.invalidationPolicyManager.deactivatePolicies(...policyEvents);
        }
        else {
            this.invalidationPolicyManager.deactivatePolicies(types_1.InvalidationPolicyEvent.Read, types_1.InvalidationPolicyEvent.Write, types_1.InvalidationPolicyEvent.Evict);
        }
    }
    // Returns the policy events that are currently active.
    activePolicyEvents() {
        return [
            types_1.InvalidationPolicyEvent.Read,
            types_1.InvalidationPolicyEvent.Write,
            types_1.InvalidationPolicyEvent.Evict
        ].filter(policyEvent => this.invalidationPolicyManager.isPolicyEventActive(policyEvent));
    }
    read(options) {
        const result = super.read(options);
        if (!this.invalidationPolicyManager.isPolicyEventActive(types_1.InvalidationPolicyEvent.Read)) {
            return result;
        }
        const processedResult = helpers_1.maybeDeepClone(result);
        const processedResultStatus = this.cacheResultProcessor.processReadResult(processedResult, options);
        if (processedResultStatus === CacheResultProcessor_1.ReadResultStatus.Complete) {
            return result;
        }
        this.broadcastWatches();
        return processedResultStatus === CacheResultProcessor_1.ReadResultStatus.Evicted
            ? null
            : processedResult;
    }
    diff(options) {
        const cacheDiff = super.diff(options);
        // Diff calls made by `broadcastWatches` should not trigger the read policy
        // as these are internal reads not reflective of client action and can lead to recursive recomputation of cached data which is an error.
        // Instead, diffs will trigger the read policies for client-based reads like `readCache` invocations from watched queries outside
        // the scope of broadcasts.
        if (!this.invalidationPolicyManager.isPolicyEventActive(types_1.InvalidationPolicyEvent.Read) ||
            this.isBroadcasting) {
            return cacheDiff;
        }
        const { result } = cacheDiff;
        const processedResult = helpers_1.maybeDeepClone(result);
        const processedResultStatus = this.cacheResultProcessor.processReadResult(processedResult, options);
        if (processedResultStatus === CacheResultProcessor_1.ReadResultStatus.Complete) {
            return cacheDiff;
        }
        this.broadcastWatches();
        cacheDiff.complete = false;
        cacheDiff.result =
            processedResultStatus === CacheResultProcessor_1.ReadResultStatus.Evicted
                ? undefined
                : processedResult;
        return cacheDiff;
    }
    extract(optimistic = false, withInvalidation = true) {
        const extractedCache = super.extract(optimistic);
        if (withInvalidation) {
            // The entitiesById are sufficient alone for reconstructing the type map, so to
            // minimize payload size only inject the entitiesById object into the extracted cache
            extractedCache.invalidation = lodash_1.default.pick(this.entityTypeMap.extract(), "entitiesById");
        }
        return extractedCache;
    }
}
exports.default = InvalidationPolicyCache;
//# sourceMappingURL=InvalidationPolicyCache.js.map