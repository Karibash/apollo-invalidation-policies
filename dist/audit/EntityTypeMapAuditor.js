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
import EntityTypeMap from "../entity-store/EntityTypeMap";
var EntityTypeMapAuditorEvent;
(function (EntityTypeMapAuditorEvent) {
    EntityTypeMapAuditorEvent["Write"] = "Write";
    EntityTypeMapAuditorEvent["Evict"] = "Evict";
})(EntityTypeMapAuditorEvent || (EntityTypeMapAuditorEvent = {}));
var EntityTypeMapAudtior = /** @class */ (function (_super) {
    __extends(EntityTypeMapAudtior, _super);
    function EntityTypeMapAudtior(config) {
        var _this = _super.call(this) || this;
        _this.auditLog = config.auditLog;
        return _this;
    }
    EntityTypeMapAudtior.prototype.write = function (typename, dataId, storeFieldName, variables) {
        this.auditLog.log("Writing to type map", EntityTypeMapAuditorEvent.Write, "EntityTypeMap", {
            typename: typename,
            dataId: dataId,
            storeFieldName: storeFieldName,
            variables: variables,
        });
        return _super.prototype.write.call(this, typename, dataId, storeFieldName, variables);
    };
    EntityTypeMapAudtior.prototype.evict = function (dataId, storeFieldName) {
        this.auditLog.log("Evicting from type map", EntityTypeMapAuditorEvent.Evict, "EntityTypeMap", {
            dataId: dataId,
            storeFieldName: storeFieldName,
        });
        return _super.prototype.evict.call(this, dataId, storeFieldName);
    };
    return EntityTypeMapAudtior;
}(EntityTypeMap));
export default EntityTypeMapAudtior;
//# sourceMappingURL=EntityTypeMapAuditor.js.map