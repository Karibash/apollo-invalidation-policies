var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var InvalidationPolicyCache = /** @class */ (function (_super) {
    __extends(InvalidationPolicyCache, _super);
    function InvalidationPolicyCache(config) {
        if (config === void 0) { config = {}; }
        var _this = this;
        var _a = config.invalidationPolicies, invalidationPolicies = _a === void 0 ? {} : _a, inMemoryCacheConfig = __rest(config, ["invalidationPolicies"]);
        _this = _super.call(this, inMemoryCacheConfig) || this;
        // @ts-ignore
        _this.entityStoreRoot = _this.data;
        _this.isBroadcasting = false;
        _this.entityTypeMap = new EntityTypeMap();
        new EntityStoreWatcher({
            entityStore: _this.entityStoreRoot,
            entityTypeMap: _this.entityTypeMap,
            policies: _this.policies,
        });
        _this.invalidationPolicyManager = new InvalidationPolicyManager({
            policies: invalidationPolicies,
            entityTypeMap: _this.entityTypeMap,
            cacheOperations: {
                evict: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    return _this.evict.apply(_this, args);
                },
                modify: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    return _this.modify.apply(_this, args);
                },
                readField: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    return _this.readField.apply(_this, args);
                },
            },
        });
        _this.cacheResultProcessor = new CacheResultProcessor({
            invalidationPolicyManager: _this.invalidationPolicyManager,
            entityTypeMap: _this.entityTypeMap,
            cache: _this,
        });
        return _this;
    }
    InvalidationPolicyCache.prototype.readField = function (fieldNameOrOptions, from) {
        if (!fieldNameOrOptions) {
            return;
        }
        var options = typeof fieldNameOrOptions === "string"
            ? {
                fieldName: fieldNameOrOptions,
                from: from,
            }
            : fieldNameOrOptions;
        if (void 0 === options.from) {
            options.from = { __ref: 'ROOT_QUERY' };
        }
        return this.policies.readField(options, {
            store: this.entityStoreRoot,
        });
    };
    InvalidationPolicyCache.prototype.broadcastWatches = function () {
        this.isBroadcasting = true;
        _super.prototype.broadcastWatches.call(this);
        this.isBroadcasting = false;
    };
    // Determines whether the cache's data reference is set to the root store. If not, then there is an ongoing optimistic transaction
    // being applied to a new layer.
    InvalidationPolicyCache.prototype.isOperatingOnRootData = function () {
        // @ts-ignore
        return this.data === this.entityStoreRoot;
    };
    InvalidationPolicyCache.prototype.modify = function (options) {
        var _this = this;
        var _a;
        var modifyResult = _super.prototype.modify.call(this, options);
        if (!this.invalidationPolicyManager.isPolicyEventActive(InvalidationPolicyEvent.Write) ||
            !modifyResult) {
            return modifyResult;
        }
        var _b = options.id, id = _b === void 0 ? "ROOT_QUERY" : _b, fields = options.fields;
        if (isQuery(id)) {
            Object.keys(fields).forEach(function (storeFieldName) {
                var _a;
                var fieldName = fieldNameFromStoreName(storeFieldName);
                var typename = (_a = _this.entityTypeMap.readEntityById(makeEntityId(id, fieldName))) === null || _a === void 0 ? void 0 : _a.typename;
                if (!typename) {
                    return;
                }
                _this.invalidationPolicyManager.runWritePolicy(typename, {
                    parent: {
                        id: id,
                        fieldName: fieldName,
                        storeFieldName: storeFieldName,
                        ref: makeReference(id),
                    },
                });
            });
        }
        else {
            var typename = (_a = this.entityTypeMap.readEntityById(id)) === null || _a === void 0 ? void 0 : _a.typename;
            if (!typename) {
                return modifyResult;
            }
            this.invalidationPolicyManager.runWritePolicy(typename, {
                parent: {
                    id: id,
                    ref: makeReference(id),
                },
            });
        }
        if (options.broadcast) {
            this.broadcastWatches();
        }
        return modifyResult;
    };
    InvalidationPolicyCache.prototype.write = function (options) {
        var writeResult = _super.prototype.write.call(this, options);
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
    };
    InvalidationPolicyCache.prototype.evict = function (options) {
        var _a;
        var fieldName = options.fieldName, args = options.args;
        var id = options.id;
        if (!id) {
            if (Object.prototype.hasOwnProperty.call(options, "id")) {
                return false;
            }
            id = "ROOT_QUERY";
        }
        if (this.invalidationPolicyManager.isPolicyEventActive(InvalidationPolicyEvent.Evict)) {
            var typename = ((_a = this.entityTypeMap.readEntityById(makeEntityId(id, fieldName))) !== null && _a !== void 0 ? _a : {}).typename;
            if (typename) {
                var storeFieldName = isQuery(id) && fieldName
                    ? this.policies.getStoreFieldName({
                        typename: typename,
                        fieldName: fieldName,
                        args: args,
                    })
                    : undefined;
                this.invalidationPolicyManager.runEvictPolicy(typename, {
                    parent: {
                        id: id,
                        fieldName: fieldName,
                        storeFieldName: storeFieldName,
                        variables: args,
                        ref: makeReference(id),
                    },
                });
            }
        }
        return _super.prototype.evict.call(this, options);
    };
    // Returns all expired entities whose cache time exceeds their type's timeToLive or as a fallback
    // the global timeToLive if specified. Evicts the expired entities by default, with an option to only report
    // them.
    InvalidationPolicyCache.prototype._expire = function (reportOnly) {
        var _this = this;
        if (reportOnly === void 0) { reportOnly = false; }
        var entitiesById = this.entityTypeMap.extract().entitiesById;
        var expiredEntityIds = [];
        Object.keys(entitiesById).forEach(function (entityId) {
            var entity = entitiesById[entityId];
            var storeFieldNames = entity.storeFieldNames, dataId = entity.dataId, fieldName = entity.fieldName, typename = entity.typename;
            if (isQuery(dataId) && storeFieldNames) {
                Object.keys(storeFieldNames.entries).forEach(function (storeFieldName) {
                    var isExpired = _this.invalidationPolicyManager.runReadPolicy({
                        typename: typename,
                        dataId: dataId,
                        fieldName: fieldName,
                        storeFieldName: storeFieldName,
                        reportOnly: reportOnly,
                    });
                    if (isExpired) {
                        expiredEntityIds.push(makeEntityId(dataId, storeFieldName));
                    }
                });
            }
            else {
                var isExpired = _this.invalidationPolicyManager.runReadPolicy({
                    typename: typename,
                    dataId: dataId,
                    fieldName: fieldName,
                    reportOnly: reportOnly,
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
    };
    // Expires all entities still present in the cache that have exceeded their timeToLive. By default entities are evicted
    // lazily on read if their entity is expired. Use this expire API to eagerly remove expired entities.
    InvalidationPolicyCache.prototype.expire = function () {
        return this._expire(false);
    };
    // Returns all expired entities still present in the cache.
    InvalidationPolicyCache.prototype.expiredEntities = function () {
        return this._expire(true);
    };
    // Activates the provided policy events (on read, on write, on evict) or by default all policy events.
    InvalidationPolicyCache.prototype.activatePolicyEvents = function () {
        var _a;
        var policyEvents = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            policyEvents[_i] = arguments[_i];
        }
        if (policyEvents.length > 0) {
            (_a = this.invalidationPolicyManager).activatePolicies.apply(_a, policyEvents);
        }
        else {
            this.invalidationPolicyManager.activatePolicies(InvalidationPolicyEvent.Read, InvalidationPolicyEvent.Write, InvalidationPolicyEvent.Evict);
        }
    };
    // Deactivates the provided policy events (on read, on write, on evict) or by default all policy events.
    InvalidationPolicyCache.prototype.deactivatePolicyEvents = function () {
        var _a;
        var policyEvents = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            policyEvents[_i] = arguments[_i];
        }
        if (policyEvents.length > 0) {
            (_a = this.invalidationPolicyManager).deactivatePolicies.apply(_a, policyEvents);
        }
        else {
            this.invalidationPolicyManager.deactivatePolicies(InvalidationPolicyEvent.Read, InvalidationPolicyEvent.Write, InvalidationPolicyEvent.Evict);
        }
    };
    // Returns the policy events that are currently active.
    InvalidationPolicyCache.prototype.activePolicyEvents = function () {
        var _this = this;
        return [
            InvalidationPolicyEvent.Read,
            InvalidationPolicyEvent.Write,
            InvalidationPolicyEvent.Evict
        ].filter(function (policyEvent) { return _this.invalidationPolicyManager.isPolicyEventActive(policyEvent); });
    };
    InvalidationPolicyCache.prototype.read = function (options) {
        var result = _super.prototype.read.call(this, options);
        if (!this.invalidationPolicyManager.isPolicyEventActive(InvalidationPolicyEvent.Read)) {
            return result;
        }
        var processedResult = maybeDeepClone(result);
        var processedResultStatus = this.cacheResultProcessor.processReadResult(processedResult, options);
        if (processedResultStatus === ReadResultStatus.Complete) {
            return result;
        }
        this.broadcastWatches();
        return processedResultStatus === ReadResultStatus.Evicted
            ? null
            : processedResult;
    };
    InvalidationPolicyCache.prototype.diff = function (options) {
        var cacheDiff = _super.prototype.diff.call(this, options);
        // Diff calls made by `broadcastWatches` should not trigger the read policy
        // as these are internal reads not reflective of client action and can lead to recursive recomputation of cached data which is an error.
        // Instead, diffs will trigger the read policies for client-based reads like `readCache` invocations from watched queries outside
        // the scope of broadcasts.
        if (!this.invalidationPolicyManager.isPolicyEventActive(InvalidationPolicyEvent.Read) ||
            this.isBroadcasting) {
            return cacheDiff;
        }
        var result = cacheDiff.result;
        var processedResult = maybeDeepClone(result);
        var processedResultStatus = this.cacheResultProcessor.processReadResult(processedResult, options);
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
    };
    InvalidationPolicyCache.prototype.extract = function (optimistic, withInvalidation) {
        if (optimistic === void 0) { optimistic = false; }
        if (withInvalidation === void 0) { withInvalidation = true; }
        var extractedCache = _super.prototype.extract.call(this, optimistic);
        if (withInvalidation) {
            // The entitiesById are sufficient alone for reconstructing the type map, so to
            // minimize payload size only inject the entitiesById object into the extracted cache
            extractedCache.invalidation = _.pick(this.entityTypeMap.extract(), "entitiesById");
        }
        return extractedCache;
    };
    return InvalidationPolicyCache;
}(InMemoryCache));
export default InvalidationPolicyCache;
//# sourceMappingURL=InvalidationPolicyCache.js.map