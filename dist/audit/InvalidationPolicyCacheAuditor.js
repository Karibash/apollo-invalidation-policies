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
import InvalidationPolicyCache from "../cache/InvalidationPolicyCache";
import { CacheResultProcessor } from "../cache/CacheResultProcessor";
import InvalidationPolicyManagerAuditor from "./InvalidationPolicyManagerAuditor";
import EntityTypeMapAuditor from "./EntityTypeMapAuditor";
import AuditLog from "./AuditLog";
import { EntityStoreWatcher } from "../entity-store";
var InvalidationPolicyCacheAuditor = /** @class */ (function (_super) {
    __extends(InvalidationPolicyCacheAuditor, _super);
    function InvalidationPolicyCacheAuditor(config) {
        var _this = _super.call(this, config) || this;
        _this.auditLog = new AuditLog();
        var _a = config.invalidationPolicies, invalidationPolicies = _a === void 0 ? {} : _a;
        _this.entityTypeMap = new EntityTypeMapAuditor({ auditLog: _this.auditLog });
        new EntityStoreWatcher({
            entityStore: _this.entityStoreRoot,
            entityTypeMap: _this.entityTypeMap,
            policies: _this.policies,
        });
        _this.invalidationPolicyManager = new InvalidationPolicyManagerAuditor({
            auditLog: _this.auditLog,
            policies: invalidationPolicies,
            entityTypeMap: _this.entityTypeMap,
            cacheOperations: {
                evict: _this.evict.bind(_this),
                modify: _this.modify.bind(_this),
                readField: _this.readField.bind(_this),
            },
        });
        _this.cacheResultProcessor = new CacheResultProcessor({
            invalidationPolicyManager: _this.invalidationPolicyManager,
            entityTypeMap: _this.entityTypeMap,
            cache: _this,
        });
        return _this;
    }
    return InvalidationPolicyCacheAuditor;
}(InvalidationPolicyCache));
export default InvalidationPolicyCacheAuditor;
//# sourceMappingURL=InvalidationPolicyCacheAuditor.js.map