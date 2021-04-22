"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheResultProcessor = exports.ReadResultStatus = void 0;
const lodash_1 = __importDefault(require("lodash"));
const core_1 = require("@apollo/client/core");
const utilities_1 = require("@apollo/client/utilities");
const helpers_1 = require("../helpers");
const types_1 = require("../policies/types");
var ReadResultStatus;
(function (ReadResultStatus) {
    ReadResultStatus[ReadResultStatus["Evicted"] = 0] = "Evicted";
    ReadResultStatus[ReadResultStatus["Incomplete"] = 1] = "Incomplete";
    ReadResultStatus[ReadResultStatus["Complete"] = 2] = "Complete";
})(ReadResultStatus = exports.ReadResultStatus || (exports.ReadResultStatus = {}));
/**
 * Processes the result of a cache read/write to run invalidation policies on the deeply nested objects.
 */
class CacheResultProcessor {
    constructor(config) {
        this.config = config;
    }
    getFieldsForQuery(options) {
        const operationDefinition = utilities_1.getOperationDefinition(options.query);
        const fragmentMap = utilities_1.createFragmentMap(utilities_1.getFragmentDefinitions(options.query));
        return operationDefinition.selectionSet.selections.reduce((acc, selection) => {
            var _a, _b;
            if (utilities_1.isField(selection)) {
                acc.push(selection);
                return acc;
            }
            const selections = (_b = (_a = utilities_1.getFragmentFromSelection(selection, fragmentMap)) === null || _a === void 0 ? void 0 : _a.selectionSet) === null || _b === void 0 ? void 0 : _b.selections;
            if (selections) {
                acc.push(...selections);
            }
            return acc;
        }, []);
    }
    processReadSubResult(parentResult, fieldNameOrIndex) {
        const { cache, invalidationPolicyManager, entityTypeMap } = this.config;
        const result = lodash_1.default.isUndefined(fieldNameOrIndex)
            ? parentResult
            : parentResult[fieldNameOrIndex];
        if (lodash_1.default.isPlainObject(result)) {
            const { __typename } = result;
            const aggregateResultComplete = Object.keys(result).reduce((_acc, fieldName) => this.processReadSubResult(result, fieldName) ===
                ReadResultStatus.Complete, true);
            if (__typename) {
                const id = cache.identify(result);
                if (id) {
                    const renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(__typename);
                    if (renewalPolicy === types_1.RenewalPolicy.AccessAndWrite ||
                        renewalPolicy === types_1.RenewalPolicy.AccessOnly) {
                        entityTypeMap.renewEntity(id);
                    }
                    const evicted = invalidationPolicyManager.runReadPolicy({
                        typename: __typename,
                        dataId: id
                    });
                    if (evicted) {
                        if (lodash_1.default.isPlainObject(parentResult) && fieldNameOrIndex) {
                            delete parentResult[fieldNameOrIndex];
                        }
                        return ReadResultStatus.Evicted;
                    }
                }
            }
            return aggregateResultComplete
                ? ReadResultStatus.Complete
                : ReadResultStatus.Incomplete;
        }
        else if (lodash_1.default.isArray(result)) {
            let aggregateSubResultStatus = ReadResultStatus.Complete;
            const subResultStatuses = result.map((_subResult, index) => {
                const subResultStatus = this.processReadSubResult(result, index);
                if (subResultStatus < aggregateSubResultStatus) {
                    aggregateSubResultStatus = subResultStatus;
                }
                return subResultStatus;
            });
            if (aggregateSubResultStatus === ReadResultStatus.Evicted &&
                fieldNameOrIndex) {
                parentResult[fieldNameOrIndex] = result.filter((_subResult, index) => subResultStatuses[index] !== ReadResultStatus.Evicted);
            }
            return aggregateSubResultStatus === ReadResultStatus.Complete
                ? ReadResultStatus.Complete
                : ReadResultStatus.Incomplete;
        }
        return ReadResultStatus.Complete;
    }
    processReadResult(result, options) {
        const { cache, entityTypeMap, invalidationPolicyManager } = this.config;
        const { rootId: dataId = "ROOT_QUERY" } = options;
        if (lodash_1.default.isPlainObject(result)) {
            if (helpers_1.isQuery(dataId)) {
                const { variables } = options;
                const aggregateResultComplete = this.getFieldsForQuery(options).reduce((acc, field) => {
                    var _a;
                    const fieldName = utilities_1.resultKeyNameFromField(field);
                    const subResultStatus = this.processReadSubResult(result, fieldName);
                    const typename = (_a = entityTypeMap.readEntityById(helpers_1.makeEntityId(dataId, fieldName))) === null || _a === void 0 ? void 0 : _a.typename;
                    if (typename) {
                        const storeFieldName = cache.policies.getStoreFieldName({
                            typename,
                            fieldName,
                            field,
                            variables,
                        });
                        const renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(typename);
                        if (renewalPolicy === types_1.RenewalPolicy.AccessAndWrite ||
                            renewalPolicy === types_1.RenewalPolicy.AccessOnly) {
                            entityTypeMap.renewEntity(dataId, storeFieldName);
                        }
                        const evicted = invalidationPolicyManager.runReadPolicy({
                            typename,
                            dataId,
                            fieldName,
                            storeFieldName
                        });
                        if (evicted) {
                            delete result[fieldName];
                            return false;
                        }
                    }
                    return acc && subResultStatus === ReadResultStatus.Complete;
                }, true);
                utilities_1.maybeDeepFreeze(result);
                return aggregateResultComplete
                    ? ReadResultStatus.Complete
                    : ReadResultStatus.Incomplete;
            }
            utilities_1.maybeDeepFreeze(result);
            return this.processReadSubResult(result);
        }
        return ReadResultStatus.Complete;
    }
    processWriteSubResult(result) {
        const { cache, invalidationPolicyManager, entityTypeMap } = this.config;
        if (lodash_1.default.isPlainObject(result)) {
            const { __typename } = result;
            Object.keys(result).forEach((resultField) => this.processWriteSubResult(result[resultField]));
            if (__typename) {
                const id = cache.identify(result);
                if (id) {
                    const renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(__typename);
                    if (renewalPolicy === types_1.RenewalPolicy.WriteOnly ||
                        renewalPolicy === types_1.RenewalPolicy.AccessAndWrite) {
                        entityTypeMap.renewEntity(id);
                    }
                    invalidationPolicyManager.runWritePolicy(__typename, {
                        parent: {
                            id,
                            ref: core_1.makeReference(id),
                        },
                    });
                }
            }
        }
        else if (lodash_1.default.isArray(result)) {
            result.forEach((resultListItem) => this.processWriteSubResult(resultListItem));
        }
    }
    processWriteResult(options) {
        var _a;
        const { dataId, variables, result } = options;
        const { entityTypeMap, cache, invalidationPolicyManager } = this.config;
        if (lodash_1.default.isPlainObject(result)) {
            this.processWriteSubResult(result);
        }
        if (dataId && helpers_1.isQuery(dataId) && lodash_1.default.isPlainObject(result)) {
            this.getFieldsForQuery(options).forEach((field) => {
                var _a, _b, _c;
                const fieldName = utilities_1.resultKeyNameFromField(field);
                const typename = (_a = entityTypeMap.readEntityById(helpers_1.makeEntityId(dataId, fieldName))) === null || _a === void 0 ? void 0 : _a.typename;
                if (typename) {
                    const storeFieldName = cache.policies.getStoreFieldName({
                        typename,
                        field,
                        fieldName,
                        variables,
                    });
                    const hasFieldArgs = ((_c = (_b = field === null || field === void 0 ? void 0 : field.arguments) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0) > 0;
                    const fieldVariables = variables !== null && variables !== void 0 ? variables : (hasFieldArgs ? {} : undefined);
                    // Write a query to the entity type map at `write` in addition to `merge` time so that we can keep track of its variables.
                    entityTypeMap.write(typename, dataId, storeFieldName, fieldVariables);
                    const renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(typename);
                    if (renewalPolicy === types_1.RenewalPolicy.WriteOnly ||
                        renewalPolicy === types_1.RenewalPolicy.AccessAndWrite) {
                        entityTypeMap.renewEntity(dataId, storeFieldName);
                    }
                    invalidationPolicyManager.runWritePolicy(typename, {
                        parent: {
                            id: dataId,
                            fieldName,
                            storeFieldName,
                            ref: core_1.makeReference(dataId),
                            variables: fieldVariables,
                        },
                    });
                }
            });
        }
        else if (dataId) {
            const typename = (_a = entityTypeMap.readEntityById(helpers_1.makeEntityId(dataId))) === null || _a === void 0 ? void 0 : _a.typename;
            if (typename) {
                const renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(typename);
                if (renewalPolicy === types_1.RenewalPolicy.WriteOnly ||
                    renewalPolicy === types_1.RenewalPolicy.AccessAndWrite) {
                    entityTypeMap.renewEntity(dataId);
                }
                invalidationPolicyManager.runWritePolicy(typename, {
                    parent: {
                        id: dataId,
                        ref: core_1.makeReference(dataId),
                        variables,
                    },
                });
            }
        }
    }
}
exports.CacheResultProcessor = CacheResultProcessor;
//# sourceMappingURL=CacheResultProcessor.js.map