import _ from "lodash";
import { makeEntityId, isQuery, fieldNameFromStoreName } from "../helpers";
/**
 * Map which stores a relationship between entities in the cache and their type
 * for efficient access of entities by type and types by entities on top of the Apollo EntityStore cache.
 *
 * An Apollo cache entry might look like this:
 * ```javascript
    {
      ROOT_QUERY: {
        __typename: 'Query',
        employees({ filter: x }): {
            __typename: 'EmployeesResponse',
            data: [{ __ref: 'Employee:1' }, { __ref: 'Employee:2' }]
        }
      },
      'Employee:1': {
        __typename: 'Employee',
        id: 1,
        name: 'Alice',
      },
      'Employee:2': {
        __typename: 'Employee',
        id: 2,
        name: 'Bob',
      }
    }
    ```

    and an EntityTypeMap structure on top of that would look like this:
    ```javascript
    {
      entitiesByType: {
      Employee: {
        "Employee:1": {
          dataId: 'Employee:1',
          typename: 'Employee',
          cacheTime: 100000,
          fieldName: null,
          storeFieldNames: null,
        },
        "Employee:2": {
          dataId: 'Employee:2',
          typename: 'Employee',
          cacheTime: 100000,
          fieldName: null,
          storeFieldNames: null,
        }
      },
      EmployeesResponse: {
        "employees": {
          dataId: 'ROOT_QUERY',
          fieldName: 'employees',
          typename: 'EmployeesResponse',
          storeFieldNames: {
            __size: 1,
            entries: {
              employees({ filter:x }): {
                cacheTime: 10000,
              }
            }
          }
        }
      }
    },
    entitiesById: {
      "Employee:1": {
        dataId: 'Employee:1',
        typename: 'Employee',
        cacheTime: 100000,
      },
      "Employee:2": {
        dataId: 'Employee:2',
        typename: 'Employee',
        cacheTime: 100000,
      },
      "ROOT_QUERY.employees": {
        dataId: 'ROOT_QUERY',
        fieldName: 'employees',
        typename: 'EmployeesResponse',
        storeFieldNames: {
          entries: {
            employees({ filter:x }): {
              cacheTime: 10000,
            }
          }
        }
      }
    }
    ```
 */
var EntityTypeMap = /** @class */ (function () {
    function EntityTypeMap() {
        this.entitiesByType = {};
        this.entitiesById = {};
    }
    EntityTypeMap.prototype.write = function (typename, dataId, storeFieldName, variables) {
        var _a;
        var fieldName = storeFieldName
            ? fieldNameFromStoreName(storeFieldName)
            : undefined;
        var entityId = makeEntityId(dataId, fieldName);
        var existingTypeMapEntity = this.readEntityById(entityId);
        if (existingTypeMapEntity) {
            if (isQuery(dataId) && storeFieldName) {
                var storeFieldNameEntry = existingTypeMapEntity.storeFieldNames
                    .entries[storeFieldName];
                if (storeFieldNameEntry) {
                    storeFieldNameEntry.variables = variables;
                }
                else {
                    existingTypeMapEntity.storeFieldNames.entries[storeFieldName] = {
                        variables: variables,
                    };
                    existingTypeMapEntity.storeFieldNames.__size++;
                }
            }
        }
        else {
            var newEntity = void 0;
            var cacheTime = Date.now();
            if (isQuery(dataId) && storeFieldName) {
                newEntity = {
                    dataId: dataId,
                    typename: typename,
                    fieldName: fieldName,
                    storeFieldNames: {
                        __size: 1,
                        entries: (_a = {},
                            _a[storeFieldName] = { variables: variables, cacheTime: cacheTime },
                            _a),
                    },
                };
            }
            else {
                newEntity = {
                    dataId: dataId,
                    typename: typename,
                    cacheTime: cacheTime,
                };
            }
            _.set(this.entitiesByType, [typename, entityId], newEntity);
            this.entitiesById[entityId] = newEntity;
        }
    };
    EntityTypeMap.prototype.evict = function (dataId, storeFieldName) {
        var _a;
        var fieldName = storeFieldName
            ? fieldNameFromStoreName(storeFieldName)
            : null;
        var entityId = makeEntityId(dataId, fieldName);
        var entity = this.readEntityById(entityId);
        if (!entity) {
            return;
        }
        // If the fieldName is the same as the passed storeFieldName, then all argument variants of that field
        // are being removed.
        if (storeFieldName && fieldName !== storeFieldName) {
            var storeFieldNameEntries = (_a = this.entitiesByType[entity.typename][entityId]) === null || _a === void 0 ? void 0 : _a.storeFieldNames;
            if (storeFieldNameEntries) {
                if (storeFieldNameEntries.__size === 1) {
                    delete this.entitiesByType[entity.typename][entityId];
                    delete this.entitiesById[entityId];
                }
                else {
                    storeFieldNameEntries.__size--;
                    delete storeFieldNameEntries.entries[storeFieldName];
                }
            }
        }
        else {
            delete this.entitiesByType[entity.typename][entityId];
            delete this.entitiesById[entityId];
        }
    };
    EntityTypeMap.prototype.readEntitiesByType = function (typeName) {
        return this.entitiesByType[typeName] || null;
    };
    EntityTypeMap.prototype.readEntityById = function (entityId) {
        return this.entitiesById[entityId] || null;
    };
    EntityTypeMap.prototype.renewEntity = function (dataId, storeFieldName) {
        var fieldName = storeFieldName
            ? fieldNameFromStoreName(storeFieldName)
            : undefined;
        var entity = this.entitiesById[makeEntityId(dataId, fieldName)];
        if (entity) {
            var cacheTime = Date.now();
            if (isQuery(dataId) && storeFieldName) {
                var storeFieldNameEntry = entity.storeFieldNames.entries[storeFieldName];
                if (storeFieldNameEntry) {
                    storeFieldNameEntry.cacheTime = cacheTime;
                }
            }
            else {
                entity.cacheTime = cacheTime;
            }
        }
    };
    EntityTypeMap.prototype.restore = function (entitiesById) {
        var _this = this;
        this.entitiesById = entitiesById;
        Object.keys(entitiesById).forEach(function (entityId) {
            var entity = entitiesById[entityId];
            if (!_this.entitiesByType[entity.typename]) {
                _this.entitiesByType[entity.typename] = {};
            }
            _this.entitiesByType[entity.typename][entityId] = entity;
        });
    };
    EntityTypeMap.prototype.extract = function () {
        var _a = this, entitiesById = _a.entitiesById, entitiesByType = _a.entitiesByType;
        return {
            entitiesById: entitiesById,
            entitiesByType: entitiesByType,
        };
    };
    EntityTypeMap.prototype.clear = function () {
        this.entitiesById = {};
        this.entitiesByType = {};
    };
    return EntityTypeMap;
}());
export default EntityTypeMap;
//# sourceMappingURL=EntityTypeMap.js.map