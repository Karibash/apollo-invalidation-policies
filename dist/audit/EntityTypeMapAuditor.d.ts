import EntityTypeMap from "../entity-store/EntityTypeMap";
import AuditLog from "./AuditLog";
interface EntityTypeMapAudtiorConfig {
    auditLog: AuditLog;
}
export default class EntityTypeMapAudtior extends EntityTypeMap {
    private auditLog;
    constructor(config: EntityTypeMapAudtiorConfig);
    write(typename: string, dataId: string, storeFieldName?: string | null, variables?: Record<string, any>): void;
    evict(dataId: string, storeFieldName?: string): void;
}
export {};
//# sourceMappingURL=EntityTypeMapAuditor.d.ts.map