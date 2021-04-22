import InvalidationPolicyManager from "../policies/InvalidationPolicyManager";
export var AuditType;
(function (AuditType) {
    AuditType["Read"] = "Read";
    AuditType["Write"] = "Write";
    AuditType["Evict"] = "Evict";
})(AuditType || (AuditType = {}));
export default class InvalidationPolicyManagerAuditor extends InvalidationPolicyManager {
    constructor(config) {
        super(config);
        this.auditLog = config.auditLog;
    }
    runReadPolicy({ typename, dataId, fieldName, storeFieldName, reportOnly = false, }) {
        this.auditLog.log("Running read policy", AuditType.Read, "InvalidationPolicyManager", {
            storeFieldName,
            typename,
            dataId,
            fieldName,
        });
        return super.runReadPolicy({
            typename,
            dataId,
            fieldName,
            storeFieldName,
            reportOnly,
        });
    }
    runWritePolicy(typeName, policyMeta) {
        this.auditLog.log("Running write policy", AuditType.Write, "InvalidationPolicyManager", Object.assign({ typeName }, policyMeta));
        return super.runWritePolicy(typeName, policyMeta);
    }
    runEvictPolicy(typeName, policyMeta) {
        this.auditLog.log("Running evict policy", AuditType.Write, "InvalidationPolicyManager", Object.assign({ typeName }, policyMeta));
        return super.runEvictPolicy(typeName, policyMeta);
    }
}
//# sourceMappingURL=InvalidationPolicyManagerAuditor.js.map