import InvalidationPolicyCache from "../cache/InvalidationPolicyCache";
import { InvalidationPolicyCacheConfig } from "../cache/types";
import AuditLog from "./AuditLog";
export default class InvalidationPolicyCacheAuditor extends InvalidationPolicyCache {
    auditLog: AuditLog;
    constructor(config: InvalidationPolicyCacheConfig);
}
//# sourceMappingURL=InvalidationPolicyCacheAuditor.d.ts.map