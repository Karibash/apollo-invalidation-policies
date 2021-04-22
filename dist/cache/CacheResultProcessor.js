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
export class CacheResultProcessor {
    constructor(config) {
        this.config = config;
    }
    getFieldsForQuery(options) {
        const operationDefinition = getOperationDefinition(options.query);
        const fragmentMap = createFragmentMap(getFragmentDefinitions(options.query));
        return operationDefinition.selectionSet.selections.reduce((acc, selection) => {
            var _a, _b;
            if (isField(selection)) {
                acc.push(selection);
                return acc;
            }
            const selections = (_b = (_a = getFragmentFromSelection(selection, fragmentMap)) === null || _a === void 0 ? void 0 : _a.selectionSet) === null || _b === void 0 ? void 0 : _b.selections;
            if (selections) {
                acc.push(...selections);
            }
            return acc;
        }, []);
    }
    processReadSubResult(parentResult, fieldNameOrIndex) {
        const { cache, invalidationPolicyManager, entityTypeMap } = this.config;
        const result = _.isUndefined(fieldNameOrIndex)
            ? parentResult
            : parentResult[fieldNameOrIndex];
        if (_.isPlainObject(result)) {
            const { __typename } = result;
            const aggregateResultComplete = Object.keys(result).reduce((_acc, fieldName) => this.processReadSubResult(result, fieldName) ===
                ReadResultStatus.Complete, true);
            if (__typename) {
                const id = cache.identify(result);
                if (id) {
                    const renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(__typename);
                    if (renewalPolicy === RenewalPolicy.AccessAndWrite ||
                        renewalPolicy === RenewalPolicy.AccessOnly) {
                        entityTypeMap.renewEntity(id);
                    }
                    const evicted = invalidationPolicyManager.runReadPolicy({
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
        if (_.isPlainObject(result)) {
            if (isQuery(dataId)) {
                const { variables } = options;
                const aggregateResultComplete = this.getFieldsForQuery(options).reduce((acc, field) => {
                    var _a;
                    const fieldName = resultKeyNameFromField(field);
                    const subResultStatus = this.processReadSubResult(result, fieldName);
                    const typename = (_a = entityTypeMap.readEntityById(makeEntityId(dataId, fieldName))) === null || _a === void 0 ? void 0 : _a.typename;
                    if (typename) {
                        const storeFieldName = cache.policies.getStoreFieldName({
                            typename,
                            fieldName,
                            field,
                            variables,
                        });
                        const renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(typename);
                        if (renewalPolicy === RenewalPolicy.AccessAndWrite ||
                            renewalPolicy === RenewalPolicy.AccessOnly) {
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
                maybeDeepFreeze(result);
                return aggregateResultComplete
                    ? ReadResultStatus.Complete
                    : ReadResultStatus.Incomplete;
            }
            maybeDeepFreeze(result);
            return this.processReadSubResult(result);
        }
        return ReadResultStatus.Complete;
    }
    processWriteSubResult(result) {
        const { cache, invalidationPolicyManager, entityTypeMap } = this.config;
        if (_.isPlainObject(result)) {
            const { __typename } = result;
            Object.keys(result).forEach((resultField) => this.processWriteSubResult(result[resultField]));
            if (__typename) {
                const id = cache.identify(result);
                if (id) {
                    const renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(__typename);
                    if (renewalPolicy === RenewalPolicy.WriteOnly ||
                        renewalPolicy === RenewalPolicy.AccessAndWrite) {
                        entityTypeMap.renewEntity(id);
                    }
                    invalidationPolicyManager.runWritePolicy(__typename, {
                        parent: {
                            id,
                            ref: makeReference(id),
                        },
                    });
                }
            }
        }
        else if (_.isArray(result)) {
            result.forEach((resultListItem) => this.processWriteSubResult(resultListItem));
        }
    }
    processWriteResult(options) {
        var _a;
        const { dataId, variables, result } = options;
        const { entityTypeMap, cache, invalidationPolicyManager } = this.config;
        if (_.isPlainObject(result)) {
            this.processWriteSubResult(result);
        }
        if (dataId && isQuery(dataId) && _.isPlainObject(result)) {
            this.getFieldsForQuery(options).forEach((field) => {
                var _a, _b, _c;
                const fieldName = resultKeyNameFromField(field);
                const typename = (_a = entityTypeMap.readEntityById(makeEntityId(dataId, fieldName))) === null || _a === void 0 ? void 0 : _a.typename;
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
                    if (renewalPolicy === RenewalPolicy.WriteOnly ||
                        renewalPolicy === RenewalPolicy.AccessAndWrite) {
                        entityTypeMap.renewEntity(dataId, storeFieldName);
                    }
                    invalidationPolicyManager.runWritePolicy(typename, {
                        parent: {
                            id: dataId,
                            fieldName,
                            storeFieldName,
                            ref: makeReference(dataId),
                            variables: fieldVariables,
                        },
                    });
                }
            });
        }
        else if (dataId) {
            const typename = (_a = entityTypeMap.readEntityById(makeEntityId(dataId))) === null || _a === void 0 ? void 0 : _a.typename;
            if (typename) {
                const renewalPolicy = invalidationPolicyManager.getRenewalPolicyForType(typename);
                if (renewalPolicy === RenewalPolicy.WriteOnly ||
                    renewalPolicy === RenewalPolicy.AccessAndWrite) {
                    entityTypeMap.renewEntity(dataId);
                }
                invalidationPolicyManager.runWritePolicy(typename, {
                    parent: {
                        id: dataId,
                        ref: makeReference(dataId),
                        variables,
                    },
                });
            }
        }
    }
}
//# sourceMappingURL=CacheResultProcessor.js.map