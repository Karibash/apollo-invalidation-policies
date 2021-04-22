import _ from "lodash";
export function isQuery(dataId) {
    return dataId === "ROOT_QUERY" || dataId === "ROOT_MUTATION";
}
/**
 * Returns a store entity ID matching the path at which the entity is found in the entity store.
 * For a store entity of a normalized type, the entity ID would be the data ID:
 * ex. Employee:1
 * For a store entity of a query, the entity ID would be the root operation plus the field name if specified:
 * ex. ROOT_QUERY.employees
 */
export function makeEntityId(dataId, fieldName) {
    if (isQuery(dataId)) {
        return _.compact([dataId, fieldName]).join(".");
    }
    return dataId;
}
// In development, results are frozen and updating them as part of executing the read policy must be done
// on a cloned object. This has no impact in production since objects are not frozen and will not be cloned:
// https://github.com/apollographql/apollo-client/blob/master/src/utilities/common/maybeDeepFreeze.ts#L20:L20
export var maybeDeepClone = function (obj) {
    return _.isPlainObject(obj) && Object.isFrozen(obj) ? _.cloneDeep(obj) : obj;
};
export var TypeOrFieldNameRegExp = /^[_a-z][_0-9a-z]*/i;
export function fieldNameFromStoreName(storeFieldName) {
    var match = storeFieldName.match(TypeOrFieldNameRegExp);
    return match ? match[0] : storeFieldName;
}
//# sourceMappingURL=helpers.js.map