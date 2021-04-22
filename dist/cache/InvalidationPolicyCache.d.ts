import { InMemoryCache, Cache, NormalizedCacheObject, Reference, StoreObject } from "@apollo/client/core";
import InvalidationPolicyManager from "../policies/InvalidationPolicyManager";
import { EntityTypeMap } from "../entity-store";
import { InvalidationPolicyCacheConfig } from "./types";
import { CacheResultProcessor } from "./CacheResultProcessor";
import { InvalidationPolicyEvent, ReadFieldOptions } from "../policies/types";
/**
 * Extension of Apollo in-memory cache which adds support for invalidation policies.
 */
export default class InvalidationPolicyCache extends InMemoryCache {
    protected entityTypeMap: EntityTypeMap;
    protected invalidationPolicyManager: InvalidationPolicyManager;
    protected cacheResultProcessor: CacheResultProcessor;
    protected entityStoreRoot: any;
    protected isBroadcasting: boolean;
    constructor(config?: InvalidationPolicyCacheConfig);
    protected readField<T>(fieldNameOrOptions?: string | ReadFieldOptions, from?: StoreObject | Reference): import("@apollo/client/cache/core/types/common").SafeReadonly<T> | undefined;
    protected broadcastWatches(): void;
    isOperatingOnRootData(): boolean;
    modify(options: Cache.ModifyOptions): boolean;
    write(options: Cache.WriteOptions<any, any>): Reference | undefined;
    evict(options: Cache.EvictOptions): boolean;
    private _expire;
    expire(): string[];
    expiredEntities(): string[];
    activatePolicyEvents(...policyEvents: InvalidationPolicyEvent[]): void;
    deactivatePolicyEvents(...policyEvents: InvalidationPolicyEvent[]): void;
    activePolicyEvents(): InvalidationPolicyEvent[];
    read<T>(options: Cache.ReadOptions<any>): T | null;
    diff<T>(options: Cache.DiffOptions): Cache.DiffResult<T>;
    extract(optimistic?: boolean, withInvalidation?: boolean): NormalizedCacheObject;
}
//# sourceMappingURL=InvalidationPolicyCache.d.ts.map