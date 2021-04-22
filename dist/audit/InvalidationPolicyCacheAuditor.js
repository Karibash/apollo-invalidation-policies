"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const InvalidationPolicyCache_1 = __importDefault(require("../cache/InvalidationPolicyCache"));
const CacheResultProcessor_1 = require("../cache/CacheResultProcessor");
const InvalidationPolicyManagerAuditor_1 = __importDefault(require("./InvalidationPolicyManagerAuditor"));
const EntityTypeMapAuditor_1 = __importDefault(require("./EntityTypeMapAuditor"));
const AuditLog_1 = __importDefault(require("./AuditLog"));
const entity_store_1 = require("../entity-store");
class InvalidationPolicyCacheAuditor extends InvalidationPolicyCache_1.default {
    constructor(config) {
        super(config);
        this.auditLog = new AuditLog_1.default();
        const { invalidationPolicies = {} } = config;
        this.entityTypeMap = new EntityTypeMapAuditor_1.default({ auditLog: this.auditLog });
        new entity_store_1.EntityStoreWatcher({
            entityStore: this.entityStoreRoot,
            entityTypeMap: this.entityTypeMap,
            policies: this.policies,
        });
        this.invalidationPolicyManager = new InvalidationPolicyManagerAuditor_1.default({
            auditLog: this.auditLog,
            policies: invalidationPolicies,
            entityTypeMap: this.entityTypeMap,
            cacheOperations: {
                evict: this.evict.bind(this),
                modify: this.modify.bind(this),
                readField: this.readField.bind(this),
            },
        });
        this.cacheResultProcessor = new CacheResultProcessor_1.CacheResultProcessor({
            invalidationPolicyManager: this.invalidationPolicyManager,
            entityTypeMap: this.entityTypeMap,
            cache: this,
        });
    }
}
exports.default = InvalidationPolicyCacheAuditor;
//# sourceMappingURL=InvalidationPolicyCacheAuditor.js.map