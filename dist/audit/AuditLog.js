import _ from "lodash";
export default class AuditLog {
    constructor() {
        this._log = [];
    }
    log(event, type, group, meta) {
        const auditLogEntry = {
            time: Date.now(),
            type,
            event,
            meta,
            group,
        };
        this._log.push(auditLogEntry);
    }
    getLog(filter) {
        return _.filter(this._log, filter);
    }
    printLog(filter) {
        this.getLog(filter).forEach(this.printLogEntry);
    }
    printLogEntry(entry) {
        var _a;
        console.log(`%c event: ${entry.event}`, "color: green");
        console.group();
        console.log(`type: ${entry.type}`);
        console.log(`time: ${entry.time}`);
        console.log(`meta: ${JSON.stringify((_a = entry.meta) !== null && _a !== void 0 ? _a : {})}`);
        console.groupEnd();
    }
}
//# sourceMappingURL=AuditLog.js.map