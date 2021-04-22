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
export default class InvalidationPolicyManager {
    constructor(config) {
        this.config = config;
        this.policyActionStorage = {};
        const { cacheOperations: { readField, evict, modify }, } = this.config;
        // Watch broadcasts by evict and modify operations called by policy actions
        // are suppressed until after all policy actions have run.
        this.mutedCacheOperations = {
            readField,
            evict: (options) => evict(Object.assign(Object.assign({}, options), { broadcast: false })),
            modify: (options) => modify(Object.assign(Object.assign({}, options), { broadcast: false })),
        };
        this.activePolicyEvents = this.activateInitialPolicyEvents();
    }
    activateInitialPolicyEvents() {
        const { policies } = this.config;
        const { types: policyTypes = {}, timeToLive: defaultTimeToLive } = policies;
        return Object.keys(policyTypes).reduce((acc, type) => {
            const policy = policyTypes[type];
            acc[InvalidationPolicyEvent.Read] =
                acc[InvalidationPolicyEvent.Read] || !!policy.timeToLive;
            acc[InvalidationPolicyEvent.Write] =
                acc[InvalidationPolicyEvent.Write] ||
                    !!policy[InvalidationPolicyLifecycleEvent.Write];
            acc[InvalidationPolicyEvent.Evict] =
                acc[InvalidationPolicyEvent.Evict] ||
                    !!policy[InvalidationPolicyLifecycleEvent.Evict];
            return acc;
        }, {
            [InvalidationPolicyEvent.Read]: !!defaultTimeToLive,
            [InvalidationPolicyEvent.Write]: false,
            [InvalidationPolicyEvent.Evict]: false,
        });
    }
    getPolicy(typeName) {
        var _a, _b;
        return ((_b = (_a = this.config.policies) === null || _a === void 0 ? void 0 : _a.types) === null || _b === void 0 ? void 0 : _b[typeName]) || null;
    }
    getPolicyActionStorage(identifier) {
        const existingStorage = this.policyActionStorage[identifier];
        if (!existingStorage) {
            this.policyActionStorage[identifier] = {};
        }
        return this.policyActionStorage[identifier];
    }
    getTypePolicyForEvent(typeName, policyEvent) {
        const policyForType = this.getPolicy(typeName);
        if (!policyForType) {
            return null;
        }
        return policyForType[InvalidationPolicyLifecycleEvent[policyEvent]];
    }
    runPolicyEvent(typeName, policyEvent, policyMeta) {
        const { entityTypeMap } = this.config;
        const { mutedCacheOperations } = this;
        const typePolicyForEvent = this.getTypePolicyForEvent(typeName, policyEvent);
        if (!typePolicyForEvent) {
            return;
        }
        const { __default: defaultPolicyAction } = typePolicyForEvent, restTypePolicyTypeNames = __rest(typePolicyForEvent, ["__default"]);
        if (defaultPolicyAction) {
            defaultPolicyAction(mutedCacheOperations, Object.assign({ storage: this.getPolicyActionStorage(`${typeName}__default`) }, policyMeta));
        }
        Object.keys(restTypePolicyTypeNames).forEach((typePolicyTypeName) => {
            var _a;
            const typeMapEntities = (_a = entityTypeMap.readEntitiesByType(typePolicyTypeName)) !== null && _a !== void 0 ? _a : {};
            const policyAction = typePolicyForEvent[typePolicyTypeName];
            Object.values(typeMapEntities).forEach((typeMapEntity) => {
                const { dataId, fieldName, storeFieldNames } = typeMapEntity;
                if (storeFieldNames) {
                    Object.keys(storeFieldNames.entries).forEach((storeFieldName) => {
                        policyAction(mutedCacheOperations, Object.assign({ id: dataId, fieldName,
                            storeFieldName, variables: storeFieldNames.entries[storeFieldName].variables, ref: makeReference(dataId), storage: this.getPolicyActionStorage(storeFieldName) }, policyMeta));
                    });
                }
                else {
                    policyAction(mutedCacheOperations, Object.assign({ id: dataId, storage: this.getPolicyActionStorage(dataId), ref: makeReference(dataId) }, policyMeta));
                }
            });
        });
    }
    getRenewalPolicyForType(typename) {
        var _a, _b, _c, _d;
        const { policies } = this.config;
        return ((_d = (_c = (_b = (_a = policies.types) === null || _a === void 0 ? void 0 : _a[typename]) === null || _b === void 0 ? void 0 : _b.renewalPolicy) !== null && _c !== void 0 ? _c : policies.renewalPolicy) !== null && _d !== void 0 ? _d : RenewalPolicy.WriteOnly);
    }
    runWritePolicy(typeName, policyMeta) {
        return this.runPolicyEvent(typeName, InvalidationPolicyEvent.Write, policyMeta);
    }
    runEvictPolicy(typeName, policyMeta) {
        return this.runPolicyEvent(typeName, InvalidationPolicyEvent.Evict, policyMeta);
    }
    // Runs the read poliy on the entity, returning whether its TTL was expired.
    runReadPolicy({ typename, dataId, fieldName, storeFieldName, reportOnly = false, }) {
        var _a;
        const { cacheOperations, entityTypeMap, policies } = this.config;
        const entityId = makeEntityId(dataId, fieldName);
        const typeMapEntity = entityTypeMap.readEntityById(entityId);
        if (!typeMapEntity) {
            return false;
        }
        let entityCacheTime;
        // If a read is done against an entity before it has ever been written, it would not be present in the cache yet and should not attempt
        // to have read policy eviction run on it. This can occur in the case of fetching a query field over the network for example, where first
        // before it has come back from the network, the Apollo Client tries to diff it against the store to see what the existing value is for it,
        // but on first fetch it would not exist.
        if (storeFieldName && !!typeMapEntity.storeFieldNames) {
            const entityForStoreFieldName = typeMapEntity.storeFieldNames.entries[storeFieldName];
            if (!entityForStoreFieldName) {
                return false;
            }
            entityCacheTime = entityForStoreFieldName.cacheTime;
        }
        else {
            entityCacheTime = typeMapEntity.cacheTime;
        }
        const timeToLive = ((_a = this.getPolicy(typename)) === null || _a === void 0 ? void 0 : _a.timeToLive) || policies.timeToLive;
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
    }
    activatePolicies(...policyEvents) {
        policyEvents.forEach(policyEvent => this.activePolicyEvents[policyEvent] = true);
    }
    deactivatePolicies(...policyEvents) {
        policyEvents.forEach(policyEvent => this.activePolicyEvents[policyEvent] = false);
    }
    isPolicyEventActive(policyEvent) {
        return this.activePolicyEvents[policyEvent];
    }
}
//# sourceMappingURL=InvalidationPolicyManager.js.map