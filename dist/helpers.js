"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldNameFromStoreName = exports.TypeOrFieldNameRegExp = exports.maybeDeepClone = exports.makeEntityId = exports.isQuery = void 0;
const lodash_1 = __importDefault(require("lodash"));
function isQuery(dataId) {
    return dataId === "ROOT_QUERY" || dataId === "ROOT_MUTATION";
}
exports.isQuery = isQuery;
/**
 * Returns a store entity ID matching the path at which the entity is found in the entity store.
 * For a store entity of a normalized type, the entity ID would be the data ID:
 * ex. Employee:1
 * For a store entity of a query, the entity ID would be the root operation plus the field name if specified:
 * ex. ROOT_QUERY.employees
 */
function makeEntityId(dataId, fieldName) {
    if (isQuery(dataId)) {
        return lodash_1.default.compact([dataId, fieldName]).join(".");
    }
    return dataId;
}
exports.makeEntityId = makeEntityId;
// In development, results are frozen and updating them as part of executing the read policy must be done
// on a cloned object. This has no impact in production since objects are not frozen and will not be cloned:
// https://github.com/apollographql/apollo-client/blob/master/src/utilities/common/maybeDeepFreeze.ts#L20:L20
exports.maybeDeepClone = (obj) => lodash_1.default.isPlainObject(obj) && Object.isFrozen(obj) ? lodash_1.default.cloneDeep(obj) : obj;
exports.TypeOrFieldNameRegExp = /^[_a-z][_0-9a-z]*/i;
function fieldNameFromStoreName(storeFieldName) {
    var match = storeFieldName.match(exports.TypeOrFieldNameRegExp);
    return match ? match[0] : storeFieldName;
}
exports.fieldNameFromStoreName = fieldNameFromStoreName;
//# sourceMappingURL=helpers.js.map