import EntityTypeMap from "../entity-store/EntityTypeMap";
var EntityTypeMapAuditorEvent;
(function (EntityTypeMapAuditorEvent) {
    EntityTypeMapAuditorEvent["Write"] = "Write";
    EntityTypeMapAuditorEvent["Evict"] = "Evict";
})(EntityTypeMapAuditorEvent || (EntityTypeMapAuditorEvent = {}));
export default class EntityTypeMapAudtior extends EntityTypeMap {
    constructor(config) {
        super();
        this.auditLog = config.auditLog;
    }
    write(typename, dataId, storeFieldName, variables) {
        this.auditLog.log("Writing to type map", EntityTypeMapAuditorEvent.Write, "EntityTypeMap", {
            typename,
            dataId,
            storeFieldName,
            variables,
        });
        return super.write(typename, dataId, storeFieldName, variables);
    }
    evict(dataId, storeFieldName) {
        this.auditLog.log("Evicting from type map", EntityTypeMapAuditorEvent.Evict, "EntityTypeMap", {
            dataId,
            storeFieldName,
        });
        return super.evict(dataId, storeFieldName);
    }
}
//# sourceMappingURL=EntityTypeMapAuditor.js.map