import _ from "lodash";
import { makeReference } from "@apollo/client/core";
import { createFragmentMap, getFragmentDefinitions, getFragmentFromSelection, getOperationDefinition, isField, maybeDeepFreeze, resultKeyNameFromField, } from "@apollo/client/utilities";
import { makeEntityId, isQuery } from "../helpers";
import { RenewalPolicy } from "../policies/types";
export var ReadResultStatus;
(function (ReadResultStatus) {
    ReadResultStatus[ReadResultStatus["Evicted"] = 0] = "Evicted";
    ReadResultStatus[ReadResultStatus["Incomplete"] = 1] = "Incomplete";
    ReadResultStatus[ReadResultStatus["Complete"] = 2] = "Complete";
})(ReadResultStatus || (ReadResultStatus = {}));
/**
 * Processes the result of a cache read/write to run invalidation policies on the deeply nested objects.
 */
var CacheResultProcessor = /** @class */ (function () {
    function CacheResultProcessor(config) {
        this.config = config;
    }
    CacheResultProcessor.prototype.getFieldsForQuery = function (options) {
        var operationDefinition = getOperationDefinition(options.query);
        var fragmentMap = createFragmentMap(getFragmentDefinitions(options.query));
        return operationDefinition.selectionSet.selections.reduce(function (acc, selection) {
            var _a, _b;
            if (isField(selection)) {
                acc.push(selection);
                return acc;
            }
            var selections = (_b = (_a = getFragmentFromSelection(selection, fragmentMap)) === null || _a === void 0 ? void 0 : _a.selectionSet) === null || _b === void 0 ? void 0 : _b.selections;
            if (selections) {
                acc.push.apply(acc, selections);
            }
            return acc;
        }, []);
    };
    CacheResultProcessor.prototype.processReadSubResult = function (parentResult, fieldNameOrIndex) {
        var _this = this;
        var _a = this.config, cache = _a.cache, invalidationPolicyManager = _a.invalidationPolicyManager, entityTypeMap = _a.entityTypeMap;
        var result = _.isUndefined(fieldNameOrIndex)
            ? parentResult
            : parentResult[fieldNameOrIndex];
        if (_.isPlainObject(result)) {
            var __typename = result.__typename;
            var aggregateResultComplete = Object.keys(result).reduce(function (_acc, fieldName) {
                return _this.processReadSubResult(result, fieldName) ===
                    ReadResultStatus.Complete;
            }, true);
            if (__typename) {
                var id = cache.identify(result);
                if (id) {
                    var renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(__typename);
                    if (renewalPolicy === RenewalPolicy.AccessAndWrite ||
                        renewalPolicy === RenewalPolicy.AccessOnly) {
                        entityTypeMap.renewEntity(id);
                    }
                    var evicted = invalidationPolicyManager.runReadPolicy({
                        typename: __typename,
                        dataId: id
                    });
                    if (evicted) {
                        if (_.isPlainObject(parentResult) && fieldNameOrIndex) {
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
        else if (_.isArray(result)) {
            var aggregateSubResultStatus_1 = ReadResultStatus.Complete;
            var subResultStatuses_1 = result.map(function (_subResult, index) {
                var subResultStatus = _this.processReadSubResult(result, index);
                if (subResultStatus < aggregateSubResultStatus_1) {
                    aggregateSubResultStatus_1 = subResultStatus;
                }
                return subResultStatus;
            });
            if (aggregateSubResultStatus_1 === ReadResultStatus.Evicted &&
                fieldNameOrIndex) {
                parentResult[fieldNameOrIndex] = result.filter(function (_subResult, index) {
                    return subResultStatuses_1[index] !== ReadResultStatus.Evicted;
                });
            }
            return aggregateSubResultStatus_1 === ReadResultStatus.Complete
                ? ReadResultStatus.Complete
                : ReadResultStatus.Incomplete;
        }
        return ReadResultStatus.Complete;
    };
    CacheResultProcessor.prototype.processReadResult = function (result, options) {
        var _this = this;
        var _a = this.config, cache = _a.cache, entityTypeMap = _a.entityTypeMap, invalidationPolicyManager = _a.invalidationPolicyManager;
        var _b = options.rootId, dataId = _b === void 0 ? "ROOT_QUERY" : _b;
        if (_.isPlainObject(result)) {
            if (isQuery(dataId)) {
                var variables_1 = options.variables;
                var aggregateResultComplete = this.getFieldsForQuery(options).reduce(function (acc, field) {
                    var _a;
                    var fieldName = resultKeyNameFromField(field);
                    var subResultStatus = _this.processReadSubResult(result, fieldName);
                    var typename = (_a = entityTypeMap.readEntityById(makeEntityId(dataId, fieldName))) === null || _a === void 0 ? void 0 : _a.typename;
                    if (typename) {
                        var storeFieldName = cache.policies.getStoreFieldName({
                            typename: typename,
                            fieldName: fieldName,
                            field: field,
                            variables: variables_1,
                        });
                        var renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(typename);
                        if (renewalPolicy === RenewalPolicy.AccessAndWrite ||
                            renewalPolicy === RenewalPolicy.AccessOnly) {
                            entityTypeMap.renewEntity(dataId, storeFieldName);
                        }
                        var evicted = invalidationPolicyManager.runReadPolicy({
                            typename: typename,
                            dataId: dataId,
                            fieldName: fieldName,
                            storeFieldName: storeFieldName
                        });
                        if (evicted) {
                            delete result[fieldName];
                            return false;
                        }
                    }
                    return acc && subResultStatus === ReadResultStatus.Complete;
                }, true);
                maybeDeepFreeze(result);
                return aggregateResultComplete
                    ? ReadResultStatus.Complete
                    : ReadResultStatus.Incomplete;
            }
            maybeDeepFreeze(result);
            return this.processReadSubResult(result);
        }
        return ReadResultStatus.Complete;
    };
    CacheResultProcessor.prototype.processWriteSubResult = function (result) {
        var _this = this;
        var _a = this.config, cache = _a.cache, invalidationPolicyManager = _a.invalidationPolicyManager, entityTypeMap = _a.entityTypeMap;
        if (_.isPlainObject(result)) {
            var __typename = result.__typename;
            Object.keys(result).forEach(function (resultField) {
                return _this.processWriteSubResult(result[resultField]);
            });
            if (__typename) {
                var id = cache.identify(result);
                if (id) {
                    var renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(__typename);
                    if (renewalPolicy === RenewalPolicy.WriteOnly ||
                        renewalPolicy === RenewalPolicy.AccessAndWrite) {
                        entityTypeMap.renewEntity(id);
                    }
                    invalidationPolicyManager.runWritePolicy(__typename, {
                        parent: {
                            id: id,
                            ref: makeReference(id),
                        },
                    });
                }
            }
        }
        else if (_.isArray(result)) {
            result.forEach(function (resultListItem) {
                return _this.processWriteSubResult(resultListItem);
            });
        }
    };
    CacheResultProcessor.prototype.processWriteResult = function (options) {
        var _a;
        var dataId = options.dataId, variables = options.variables, result = options.result;
        var _b = this.config, entityTypeMap = _b.entityTypeMap, cache = _b.cache, invalidationPolicyManager = _b.invalidationPolicyManager;
        if (_.isPlainObject(result)) {
            this.processWriteSubResult(result);
        }
        if (dataId && isQuery(dataId) && _.isPlainObject(result)) {
            this.getFieldsForQuery(options).forEach(function (field) {
                var _a, _b, _c;
                var fieldName = resultKeyNameFromField(field);
                var typename = (_a = entityTypeMap.readEntityById(makeEntityId(dataId, fieldName))) === null || _a === void 0 ? void 0 : _a.typename;
                if (typename) {
                    var storeFieldName = cache.policies.getStoreFieldName({
                        typename: typename,
                        field: field,
                        fieldName: fieldName,
                        variables: variables,
                    });
                    var hasFieldArgs = ((_c = (_b = field === null || field === void 0 ? void 0 : field.arguments) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0) > 0;
                    var fieldVariables = variables !== null && variables !== void 0 ? variables : (hasFieldArgs ? {} : undefined);
                    // Write a query to the entity type map at `write` in addition to `merge` time so that we can keep track of its variables.
                    entityTypeMap.write(typename, dataId, storeFieldName, fieldVariables);
                    var renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(typename);
                    if (renewalPolicy === RenewalPolicy.WriteOnly ||
                        renewalPolicy === RenewalPolicy.AccessAndWrite) {
                        entityTypeMap.renewEntity(dataId, storeFieldName);
                    }
                    invalidationPolicyManager.runWritePolicy(typename, {
                        parent: {
                            id: dataId,
                            fieldName: fieldName,
                            storeFieldName: storeFieldName,
                            ref: makeReference(dataId),
                            variables: fieldVariables,
                        },
                    });
                }
            });
        }
        else if (dataId) {
            var typename = (_a = entityTypeMap.readEntityById(makeEntityId(dataId))) === null || _a === void 0 ? void 0 : _a.typename;
            if (typename) {
                var renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(typename);
                if (renewalPolicy === RenewalPolicy.WriteOnly ||
                    renewalPolicy === RenewalPolicy.AccessAndWrite) {
                    entityTypeMap.renewEntity(dataId);
                }
                invalidationPolicyManager.runWritePolicy(typename, {
                    parent: {
                        id: dataId,
                        ref: makeReference(dataId),
                        variables: variables,
                    },
                });
            }
        }
    };
    return CacheResultProcessor;
}());
export { CacheResultProcessor };
//# sourceMappingURL=CacheResultProcessor.js.map