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
import _ from "lodash";
import { InMemoryCache, makeReference, } from "@apollo/client/core";
import InvalidationPolicyManager from "../policies/InvalidationPolicyManager";
import { EntityStoreWatcher, EntityTypeMap } from "../entity-store";
import { makeEntityId, isQuery, maybeDeepClone, fieldNameFromStoreName } from "../helpers";
import { CacheResultProcessor, ReadResultStatus } from "./CacheResultProcessor";
import { InvalidationPolicyEvent } from "../policies/types";
/**
 * Extension of Apollo in-memory cache which adds support for invalidation policies.
 */
export default class InvalidationPolicyCache extends InMemoryCache {
    constructor(config = {}) {
        const { invalidationPolicies = {} } = config, inMemoryCacheConfig = __rest(config, ["invalidationPolicies"]);
        super(inMemoryCacheConfig);
        // @ts-ignore
        this.entityStoreRoot = this.data;
        this.isBroadcasting = false;
        this.entityTypeMap = new EntityTypeMap();
        new EntityStoreWatcher({
            entityStore: this.entityStoreRoot,
            entityTypeMap: this.entityTypeMap,
            policies: this.policies,
        });
        this.invalidationPolicyManager = new InvalidationPolicyManager({
            policies: invalidationPolicies,
            entityTypeMap: this.entityTypeMap,
            cacheOperations: {
                evict: (...args) => this.evict(...args),
                modify: (...args) => this.modify(...args),
                readField: (...args) => this.readField(...args),
            },
        });
        this.cacheResultProcessor = new CacheResultProcessor({
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
        if (!this.invalidationPolicyManager.isPolicyEventActive(InvalidationPolicyEvent.Write) ||
            !modifyResult) {
            return modifyResult;
        }
        const { id = "ROOT_QUERY", fields } = options;
        if (isQuery(id)) {
            Object.keys(fields).forEach((storeFieldName) => {
                var _a;
                const fieldName = fieldNameFromStoreName(storeFieldName);
                const typename = (_a = this.entityTypeMap.readEntityById(makeEntityId(id, fieldName))) === null || _a === void 0 ? void 0 : _a.typename;
                if (!typename) {
                    return;
                }
                this.invalidationPolicyManager.runWritePolicy(typename, {
                    parent: {
                        id,
                        fieldName,
                        storeFieldName,
                        ref: makeReference(id),
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
                    ref: makeReference(id),
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
        if ((!this.invalidationPolicyManager.isPolicyEventActive(InvalidationPolicyEvent.Write) &&
            !this.invalidationPolicyManager.isPolicyEventActive(InvalidationPolicyEvent.Read)) ||
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
        if (this.invalidationPolicyManager.isPolicyEventActive(InvalidationPolicyEvent.Evict)) {
            const { typename } = (_a = this.entityTypeMap.readEntityById(makeEntityId(id, fieldName))) !== null && _a !== void 0 ? _a : {};
            if (typename) {
                const storeFieldName = isQuery(id) && fieldName
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
                        ref: makeReference(id),
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
            if (isQuery(dataId) && storeFieldNames) {
                Object.keys(storeFieldNames.entries).forEach((storeFieldName) => {
                    const isExpired = this.invalidationPolicyManager.runReadPolicy({
                        typename,
                        dataId,
                        fieldName,
                        storeFieldName,
                        reportOnly,
                    });
                    if (isExpired) {
                        expiredEntityIds.push(makeEntityId(dataId, storeFieldName));
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
                    expiredEntityIds.push(makeEntityId(dataId));
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
            this.invalidationPolicyManager.activatePolicies(InvalidationPolicyEvent.Read, InvalidationPolicyEvent.Write, InvalidationPolicyEvent.Evict);
        }
    }
    // Deactivates the provided policy events (on read, on write, on evict) or by default all policy events.
    deactivatePolicyEvents(...policyEvents) {
        if (policyEvents.length > 0) {
            this.invalidationPolicyManager.deactivatePolicies(...policyEvents);
        }
        else {
            this.invalidationPolicyManager.deactivatePolicies(InvalidationPolicyEvent.Read, InvalidationPolicyEvent.Write, InvalidationPolicyEvent.Evict);
        }
    }
    // Returns the policy events that are currently active.
    activePolicyEvents() {
        return [
            InvalidationPolicyEvent.Read,
            InvalidationPolicyEvent.Write,
            InvalidationPolicyEvent.Evict
        ].filter(policyEvent => this.invalidationPolicyManager.isPolicyEventActive(policyEvent));
    }
    read(options) {
        const result = super.read(options);
        if (!this.invalidationPolicyManager.isPolicyEventActive(InvalidationPolicyEvent.Read)) {
            return result;
        }
        const processedResult = maybeDeepClone(result);
        const processedResultStatus = this.cacheResultProcessor.processReadResult(processedResult, options);
        if (processedResultStatus === ReadResultStatus.Complete) {
            return result;
        }
        this.broadcastWatches();
        return processedResultStatus === ReadResultStatus.Evicted
            ? null
            : processedResult;
    }
    diff(options) {
        const cacheDiff = super.diff(options);
        // Diff calls made by `broadcastWatches` should not trigger the read policy
        // as these are internal reads not reflective of client action and can lead to recursive recomputation of cached data which is an error.
        // Instead, diffs will trigger the read policies for client-based reads like `readCache` invocations from watched queries outside
        // the scope of broadcasts.
        if (!this.invalidationPolicyManager.isPolicyEventActive(InvalidationPolicyEvent.Read) ||
            this.isBroadcasting) {
            return cacheDiff;
        }
        const { result } = cacheDiff;
        const processedResult = maybeDeepClone(result);
        const processedResultStatus = this.cacheResultProcessor.processReadResult(processedResult, options);
        if (processedResultStatus === ReadResultStatus.Complete) {
            return cacheDiff;
        }
        this.broadcastWatches();
        cacheDiff.complete = false;
        cacheDiff.result =
            processedResultStatus === ReadResultStatus.Evicted
                ? undefined
                : processedResult;
        return cacheDiff;
    }
    extract(optimistic = false, withInvalidation = true) {
        const extractedCache = super.extract(optimistic);
        if (withInvalidation) {
            // The entitiesById are sufficient alone for reconstructing the type map, so to
            // minimize payload size only inject the entitiesById object into the extracted cache
            extractedCache.invalidation = _.pick(this.entityTypeMap.extract(), "entitiesById");
        }
        return extractedCache;
    }
}
//# sourceMappingURL=InvalidationPolicyCache.js.map