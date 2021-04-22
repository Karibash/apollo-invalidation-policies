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
import InvalidationPolicyManager from "../policies/InvalidationPolicyManager";
export var AuditType;
(function (AuditType) {
    AuditType["Read"] = "Read";
    AuditType["Write"] = "Write";
    AuditType["Evict"] = "Evict";
})(AuditType || (AuditType = {}));
var InvalidationPolicyManagerAuditor = /** @class */ (function (_super) {
    __extends(InvalidationPolicyManagerAuditor, _super);
    function InvalidationPolicyManagerAuditor(config) {
        var _this = _super.call(this, config) || this;
        _this.auditLog = config.auditLog;
        return _this;
    }
    InvalidationPolicyManagerAuditor.prototype.runReadPolicy = function (_a) {
        var typename = _a.typename, dataId = _a.dataId, fieldName = _a.fieldName, storeFieldName = _a.storeFieldName, _b = _a.reportOnly, reportOnly = _b === void 0 ? false : _b;
        this.auditLog.log("Running read policy", AuditType.Read, "InvalidationPolicyManager", {
            storeFieldName: storeFieldName,
            typename: typename,
            dataId: dataId,
            fieldName: fieldName,
        });
        return _super.prototype.runReadPolicy.call(this, {
            typename: typename,
            dataId: dataId,
            fieldName: fieldName,
            storeFieldName: storeFieldName,
            reportOnly: reportOnly,
        });
    };
    InvalidationPolicyManagerAuditor.prototype.runWritePolicy = function (typeName, policyMeta) {
        this.auditLog.log("Running write policy", AuditType.Write, "InvalidationPolicyManager", __assign({ typeName: typeName }, policyMeta));
        return _super.prototype.runWritePolicy.call(this, typeName, policyMeta);
    };
    InvalidationPolicyManagerAuditor.prototype.runEvictPolicy = function (typeName, policyMeta) {
        this.auditLog.log("Running evict policy", AuditType.Write, "InvalidationPolicyManager", __assign({ typeName: typeName }, policyMeta));
        return _super.prototype.runEvictPolicy.call(this, typeName, policyMeta);
    };
    return InvalidationPolicyManagerAuditor;
}(InvalidationPolicyManager));
export default InvalidationPolicyManagerAuditor;
//# sourceMappingURL=InvalidationPolicyManagerAuditor.js.map