import _ from "lodash";
var AuditLog = /** @class */ (function () {
    function AuditLog() {
        this._log = [];
    }
    AuditLog.prototype.log = function (event, type, group, meta) {
        var auditLogEntry = {
            time: Date.now(),
            type: type,
            event: event,
            meta: meta,
            group: group,
        };
        this._log.push(auditLogEntry);
    };
    AuditLog.prototype.getLog = function (filter) {
        return _.filter(this._log, filter);
    };
    AuditLog.prototype.printLog = function (filter) {
        this.getLog(filter).forEach(this.printLogEntry);
    };
    AuditLog.prototype.printLogEntry = function (entry) {
        var _a;
        console.log("%c event: " + entry.event, "color: green");
        console.group();
        console.log("type: " + entry.type);
        console.log("time: " + entry.time);
        console.log("meta: " + JSON.stringify((_a = entry.meta) !== null && _a !== void 0 ? _a : {}));
        console.groupEnd();
    };
    return AuditLog;
}());
export default AuditLog;
//# sourceMappingURL=AuditLog.js.map