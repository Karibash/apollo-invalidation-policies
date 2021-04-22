"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenewalPolicy = exports.InvalidationPolicyLifecycleEvent = exports.InvalidationPolicyEvent = void 0;
var InvalidationPolicyEvent;
(function (InvalidationPolicyEvent) {
    InvalidationPolicyEvent["Write"] = "Write";
    InvalidationPolicyEvent["Evict"] = "Evict";
    InvalidationPolicyEvent["Read"] = "Read";
})(InvalidationPolicyEvent = exports.InvalidationPolicyEvent || (exports.InvalidationPolicyEvent = {}));
var InvalidationPolicyLifecycleEvent;
(function (InvalidationPolicyLifecycleEvent) {
    InvalidationPolicyLifecycleEvent["Write"] = "onWrite";
    InvalidationPolicyLifecycleEvent["Evict"] = "onEvict";
})(InvalidationPolicyLifecycleEvent = exports.InvalidationPolicyLifecycleEvent || (exports.InvalidationPolicyLifecycleEvent = {}));
var RenewalPolicy;
(function (RenewalPolicy) {
    RenewalPolicy["AccessOnly"] = "access-only";
    RenewalPolicy["AccessAndWrite"] = "access-and-write";
    RenewalPolicy["WriteOnly"] = "write-only";
    RenewalPolicy["None"] = "none";
})(RenewalPolicy = exports.RenewalPolicy || (exports.RenewalPolicy = {}));
//# sourceMappingURL=types.js.map