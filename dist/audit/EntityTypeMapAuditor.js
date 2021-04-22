"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EntityTypeMap_1 = __importDefault(require("../entity-store/EntityTypeMap"));
var EntityTypeMapAuditorEvent;
(function (EntityTypeMapAuditorEvent) {
    EntityTypeMapAuditorEvent["Write"] = "Write";
    EntityTypeMapAuditorEvent["Evict"] = "Evict";
})(EntityTypeMapAuditorEvent || (EntityTypeMapAuditorEvent = {}));
class EntityTypeMapAudtior extends EntityTypeMap_1.default {
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
exports.default = EntityTypeMapAudtior;
//# sourceMappingURL=EntityTypeMapAuditor.js.map