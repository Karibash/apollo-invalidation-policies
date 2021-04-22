"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditType = void 0;
const InvalidationPolicyManager_1 = __importDefault(require("../policies/InvalidationPolicyManager"));
var AuditType;
(function (AuditType) {
    AuditType["Read"] = "Read";
    AuditType["Write"] = "Write";
    AuditType["Evict"] = "Evict";
})(AuditType = exports.AuditType || (exports.AuditType = {}));
class InvalidationPolicyManagerAuditor extends InvalidationPolicyManager_1.default {
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
exports.default = InvalidationPolicyManagerAuditor;
//# sourceMappingURL=InvalidationPolicyManagerAuditor.js.map