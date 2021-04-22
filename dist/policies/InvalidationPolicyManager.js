var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
import { InvalidationPolicyEvent, InvalidationPolicyLifecycleEvent, } from "./types";
import { makeEntityId } from "../helpers";
import { makeReference } from "@apollo/client/core";
import { RenewalPolicy } from "./types";
/**
 * Executes invalidation policies for types when they are modified, evicted or read from the cache.
 */
var InvalidationPolicyManager = /** @class */ (function () {
    function InvalidationPolicyManager(config) {
        this.config = config;
        this.policyActionStorage = {};
        var _a = this.config.cacheOperations, readField = _a.readField, evict = _a.evict, modify = _a.modify;
        // Watch broadcasts by evict and modify operations called by policy actions
        // are suppressed until after all policy actions have run.
        this.mutedCacheOperations = {
            readField: readField,
            evict: function (options) { return evict(__assign(__assign({}, options), { broadcast: false })); },
            modify: function (options) { return modify(__assign(__assign({}, options), { broadcast: false })); },
        };
        this.activePolicyEvents = this.activateInitialPolicyEvents();
    }
    InvalidationPolicyManager.prototype.activateInitialPolicyEvents = function () {
        var _a;
        var policies = this.config.policies;
        var _b = policies.types, policyTypes = _b === void 0 ? {} : _b, defaultTimeToLive = policies.timeToLive;
        return Object.keys(policyTypes).reduce(function (acc, type) {
            var policy = policyTypes[type];
            acc[InvalidationPolicyEvent.Read] =
                acc[InvalidationPolicyEvent.Read] || !!policy.timeToLive;
            acc[InvalidationPolicyEvent.Write] =
                acc[InvalidationPolicyEvent.Write] ||
                    !!policy[InvalidationPolicyLifecycleEvent.Write];
            acc[InvalidationPolicyEvent.Evict] =
                acc[InvalidationPolicyEvent.Evict] ||
                    !!policy[InvalidationPolicyLifecycleEvent.Evict];
            return acc;
        }, (_a = {},
            _a[InvalidationPolicyEvent.Read] = !!defaultTimeToLive,
            _a[InvalidationPolicyEvent.Write] = false,
            _a[InvalidationPolicyEvent.Evict] = false,
            _a));
    };
    InvalidationPolicyManager.prototype.getPolicy = function (typeName) {
        var _a, _b;
        return ((_b = (_a = this.config.policies) === null || _a === void 0 ? void 0 : _a.types) === null || _b === void 0 ? void 0 : _b[typeName]) || null;
    };
    InvalidationPolicyManager.prototype.getPolicyActionStorage = function (identifier) {
        var existingStorage = this.policyActionStorage[identifier];
        if (!existingStorage) {
            this.policyActionStorage[identifier] = {};
        }
        return this.policyActionStorage[identifier];
    };
    InvalidationPolicyManager.prototype.getTypePolicyForEvent = function (typeName, policyEvent) {
        var policyForType = this.getPolicy(typeName);
        if (!policyForType) {
            return null;
        }
        return policyForType[InvalidationPolicyLifecycleEvent[policyEvent]];
    };
    InvalidationPolicyManager.prototype.runPolicyEvent = function (typeName, policyEvent, policyMeta) {
        var _this = this;
        var entityTypeMap = this.config.entityTypeMap;
        var mutedCacheOperations = this.mutedCacheOperations;
        var typePolicyForEvent = this.getTypePolicyForEvent(typeName, policyEvent);
        if (!typePolicyForEvent) {
            return;
        }
        var defaultPolicyAction = typePolicyForEvent.__default, restTypePolicyTypeNames = __rest(typePolicyForEvent, ["__default"]);
        if (defaultPolicyAction) {
            defaultPolicyAction(mutedCacheOperations, __assign({ storage: this.getPolicyActionStorage(typeName + "__default") }, policyMeta));
        }
        Object.keys(restTypePolicyTypeNames).forEach(function (typePolicyTypeName) {
            var _a;
            var typeMapEntities = (_a = entityTypeMap.readEntitiesByType(typePolicyTypeName)) !== null && _a !== void 0 ? _a : {};
            var policyAction = typePolicyForEvent[typePolicyTypeName];
            Object.values(typeMapEntities).forEach(function (typeMapEntity) {
                var dataId = typeMapEntity.dataId, fieldName = typeMapEntity.fieldName, storeFieldNames = typeMapEntity.storeFieldNames;
                if (storeFieldNames) {
                    Object.keys(storeFieldNames.entries).forEach(function (storeFieldName) {
                        policyAction(mutedCacheOperations, __assign({ id: dataId, fieldName: fieldName,
                            storeFieldName: storeFieldName, variables: storeFieldNames.entries[storeFieldName].variables, ref: makeReference(dataId), storage: _this.getPolicyActionStorage(storeFieldName) }, policyMeta));
                    });
                }
                else {
                    policyAction(mutedCacheOperations, __assign({ id: dataId, storage: _this.getPolicyActionStorage(dataId), ref: makeReference(dataId) }, policyMeta));
                }
            });
        });
    };
    InvalidationPolicyManager.prototype.getRenewalPolicyForType = function (typename) {
        var _a, _b, _c, _d;
        var policies = this.config.policies;
        return ((_d = (_c = (_b = (_a = policies.types) === null || _a === void 0 ? void 0 : _a[typename]) === null || _b === void 0 ? void 0 : _b.renewalPolicy) !== null && _c !== void 0 ? _c : policies.renewalPolicy) !== null && _d !== void 0 ? _d : RenewalPolicy.WriteOnly);
    };
    InvalidationPolicyManager.prototype.runWritePolicy = function (typeName, policyMeta) {
        return this.runPolicyEvent(typeName, InvalidationPolicyEvent.Write, policyMeta);
    };
    InvalidationPolicyManager.prototype.runEvictPolicy = function (typeName, policyMeta) {
        return this.runPolicyEvent(typeName, InvalidationPolicyEvent.Evict, policyMeta);
    };
    // Runs the read poliy on the entity, returning whether its TTL was expired.
    InvalidationPolicyManager.prototype.runReadPolicy = function (_a) {
        var _b;
        var typename = _a.typename, dataId = _a.dataId, fieldName = _a.fieldName, storeFieldName = _a.storeFieldName, _c = _a.reportOnly, reportOnly = _c === void 0 ? false : _c;
        var _d = this.config, cacheOperations = _d.cacheOperations, entityTypeMap = _d.entityTypeMap, policies = _d.policies;
        var entityId = makeEntityId(dataId, fieldName);
        var typeMapEntity = entityTypeMap.readEntityById(entityId);
        if (!typeMapEntity) {
            return false;
        }
        var entityCacheTime;
        // If a read is done against an entity before it has ever been written, it would not be present in the cache yet and should not attempt
        // to have read policy eviction run on it. This can occur in the case of fetching a query field over the network for example, where first
        // before it has come back from the network, the Apollo Client tries to diff it against the store to see what the existing value is for it,
        // but on first fetch it would not exist.
        if (storeFieldName && !!typeMapEntity.storeFieldNames) {
            var entityForStoreFieldName = typeMapEntity.storeFieldNames.entries[storeFieldName];
            if (!entityForStoreFieldName) {
                return false;
            }
            entityCacheTime = entityForStoreFieldName.cacheTime;
        }
        else {
            entityCacheTime = typeMapEntity.cacheTime;
        }
        var timeToLive = ((_b = this.getPolicy(typename)) === null || _b === void 0 ? void 0 : _b.timeToLive) || policies.timeToLive;
        if (_.isNumber(entityCacheTime) &&
            timeToLive &&
            Date.now() > entityCacheTime + timeToLive) {
            if (!reportOnly) {
                cacheOperations.evict({
                    id: dataId,
                    fieldName: storeFieldName,
                    broadcast: false,
                });
            }
            return true;
        }
        return false;
    };
    InvalidationPolicyManager.prototype.activatePolicies = function () {
        var _this = this;
        var policyEvents = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            policyEvents[_i] = arguments[_i];
        }
        policyEvents.forEach(function (policyEvent) { return _this.activePolicyEvents[policyEvent] = true; });
    };
    InvalidationPolicyManager.prototype.deactivatePolicies = function () {
        var _this = this;
        var policyEvents = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            policyEvents[_i] = arguments[_i];
        }
        policyEvents.forEach(function (policyEvent) { return _this.activePolicyEvents[policyEvent] = false; });
    };
    InvalidationPolicyManager.prototype.isPolicyEventActive = function (policyEvent) {
        return this.activePolicyEvents[policyEvent];
    };
    return InvalidationPolicyManager;
}());
export default InvalidationPolicyManager;
//# sourceMappingURL=InvalidationPolicyManager.js.map