interface AuditLogEntry {
    time: number;
    type: string;
    event: string;
    meta?: Record<string, any>;
    group?: string;
}
export default class AuditLog {
    private _log;
    log(event: string, type: string, group?: string, meta?: Record<string, any>): void;
    getLog(filter: AuditLogEntry): AuditLogEntry[];
    printLog(filter: AuditLogEntry): void;
    printLogEntry(entry: AuditLogEntry): void;
}
export {};
//# sourceMappingURL=AuditLog.d.ts.map