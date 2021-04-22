import InvalidationPolicyManager from "../policies/InvalidationPolicyManager";
import AuditLog from "./AuditLog";
import { PolicyActionMeta, InvalidationPolicyManagerConfig } from "../policies/types";
export declare enum AuditType {
    Read = "Read",
    Write = "Write",
    Evict = "Evict"
}
interface InvalidationPolicyManagerAuditorConfig extends InvalidationPolicyManagerConfig {
    auditLog: AuditLog;
}
export default class InvalidationPolicyManagerAuditor extends InvalidationPolicyManager {
    private auditLog;
    constructor(config: InvalidationPolicyManagerAuditorConfig);
    runReadPolicy({ typename, dataId, fieldName, storeFieldName, reportOnly, }: {
        typename: string;
        dataId: string;
        fieldName?: string;
        storeFieldName?: string;
        reportOnly: boolean;
    }): boolean;
    runWritePolicy(typeName: string, policyMeta: PolicyActionMeta): void;
    runEvictPolicy(typeName: string, policyMeta: PolicyActionMeta): void;
}
export {};
//# sourceMappingURL=InvalidationPolicyManagerAuditor.d.ts.map