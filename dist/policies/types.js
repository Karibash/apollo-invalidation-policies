export var InvalidationPolicyEvent;
(function (InvalidationPolicyEvent) {
    InvalidationPolicyEvent["Write"] = "Write";
    InvalidationPolicyEvent["Evict"] = "Evict";
    InvalidationPolicyEvent["Read"] = "Read";
})(InvalidationPolicyEvent || (InvalidationPolicyEvent = {}));
export var InvalidationPolicyLifecycleEvent;
(function (InvalidationPolicyLifecycleEvent) {
    InvalidationPolicyLifecycleEvent["Write"] = "onWrite";
    InvalidationPolicyLifecycleEvent["Evict"] = "onEvict";
})(InvalidationPolicyLifecycleEvent || (InvalidationPolicyLifecycleEvent = {}));
export var RenewalPolicy;
(function (RenewalPolicy) {
    RenewalPolicy["AccessOnly"] = "access-only";
    RenewalPolicy["AccessAndWrite"] = "access-and-write";
    RenewalPolicy["WriteOnly"] = "write-only";
    RenewalPolicy["None"] = "none";
})(RenewalPolicy || (RenewalPolicy = {}));
//# sourceMappingURL=types.js.map