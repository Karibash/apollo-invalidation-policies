import { InvalidationPolicyEvent, InvalidationPolicyManagerConfig, PolicyActionMeta } from "./types";
import { RenewalPolicy } from "./types";
/**
 * Executes invalidation policies for types when they are modified, evicted or read from the cache.
 */
export default class InvalidationPolicyManager {
    private config;
    private mutedCacheOperations;
    private activePolicyEvents;
    private policyActionStorage;
    constructor(config: InvalidationPolicyManagerConfig);
    private activateInitialPolicyEvents;
    private getPolicy;
    private getPolicyActionStorage;
    private getTypePolicyForEvent;
    private runPolicyEvent;
    getRenewalPolicyForType(typename: string): RenewalPolicy.AccessOnly | RenewalPolicy;
    runWritePolicy(typeName: string, policyMeta: PolicyActionMeta): void;
    runEvictPolicy(typeName: string, policyMeta: PolicyActionMeta): void;
    runReadPolicy({ typename, dataId, fieldName, storeFieldName, reportOnly, }: {
        typename: string;
        dataId: string;
        fieldName?: string;
        storeFieldName?: string;
        reportOnly?: boolean;
    }): boolean;
    activatePolicies(...policyEvents: InvalidationPolicyEvent[]): void;
    deactivatePolicies(...policyEvents: InvalidationPolicyEvent[]): void;
    isPolicyEventActive(policyEvent: InvalidationPolicyEvent): boolean;
}
//# sourceMappingURL=InvalidationPolicyManager.d.ts.map