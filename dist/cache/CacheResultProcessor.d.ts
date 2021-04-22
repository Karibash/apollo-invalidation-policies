import { Cache } from "@apollo/client/core";
import { CacheResultProcessorConfig } from "./types";
export declare enum ReadResultStatus {
    Evicted = 0,
    Incomplete = 1,
    Complete = 2
}
/**
 * Processes the result of a cache read/write to run invalidation policies on the deeply nested objects.
 */
export declare class CacheResultProcessor {
    private config;
    constructor(config: CacheResultProcessorConfig);
    private getFieldsForQuery;
    private processReadSubResult;
    processReadResult<T>(result: T, options: Cache.ReadOptions<any>): ReadResultStatus;
    private processWriteSubResult;
    processWriteResult(options: Cache.WriteOptions<any, any>): void;
}
//# sourceMappingURL=CacheResultProcessor.d.ts.map