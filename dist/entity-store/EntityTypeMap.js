"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const helpers_1 = require("../helpers");
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
class EntityTypeMap {
    constructor() {
        this.entitiesByType = {};
        this.entitiesById = {};
    }
    write(typename, dataId, storeFieldName, variables) {
        const fieldName = storeFieldName
            ? helpers_1.fieldNameFromStoreName(storeFieldName)
            : undefined;
        const entityId = helpers_1.makeEntityId(dataId, fieldName);
        const existingTypeMapEntity = this.readEntityById(entityId);
        if (existingTypeMapEntity) {
            if (helpers_1.isQuery(dataId) && storeFieldName) {
                const storeFieldNameEntry = existingTypeMapEntity.storeFieldNames
                    .entries[storeFieldName];
                if (storeFieldNameEntry) {
                    storeFieldNameEntry.variables = variables;
                }
                else {
                    existingTypeMapEntity.storeFieldNames.entries[storeFieldName] = {
                        variables,
                    };
                    existingTypeMapEntity.storeFieldNames.__size++;
                }
            }
        }
        else {
            let newEntity;
            const cacheTime = Date.now();
            if (helpers_1.isQuery(dataId) && storeFieldName) {
                newEntity = {
                    dataId,
                    typename,
                    fieldName,
                    storeFieldNames: {
                        __size: 1,
                        entries: {
                            [storeFieldName]: { variables, cacheTime },
                        },
                    },
                };
            }
            else {
                newEntity = {
                    dataId,
                    typename,
                    cacheTime,
                };
            }
            lodash_1.default.set(this.entitiesByType, [typename, entityId], newEntity);
            this.entitiesById[entityId] = newEntity;
        }
    }
    evict(dataId, storeFieldName) {
        var _a;
        const fieldName = storeFieldName
            ? helpers_1.fieldNameFromStoreName(storeFieldName)
            : null;
        const entityId = helpers_1.makeEntityId(dataId, fieldName);
        const entity = this.readEntityById(entityId);
        if (!entity) {
            return;
        }
        // If the fieldName is the same as the passed storeFieldName, then all argument variants of that field
        // are being removed.
        if (storeFieldName && fieldName !== storeFieldName) {
            const storeFieldNameEntries = (_a = this.entitiesByType[entity.typename][entityId]) === null || _a === void 0 ? void 0 : _a.storeFieldNames;
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
    }
    readEntitiesByType(typeName) {
        return this.entitiesByType[typeName] || null;
    }
    readEntityById(entityId) {
        return this.entitiesById[entityId] || null;
    }
    renewEntity(dataId, storeFieldName) {
        const fieldName = storeFieldName
            ? helpers_1.fieldNameFromStoreName(storeFieldName)
            : undefined;
        const entity = this.entitiesById[helpers_1.makeEntityId(dataId, fieldName)];
        if (entity) {
            const cacheTime = Date.now();
            if (helpers_1.isQuery(dataId) && storeFieldName) {
                const storeFieldNameEntry = entity.storeFieldNames.entries[storeFieldName];
                if (storeFieldNameEntry) {
                    storeFieldNameEntry.cacheTime = cacheTime;
                }
            }
            else {
                entity.cacheTime = cacheTime;
            }
        }
    }
    restore(entitiesById) {
        this.entitiesById = entitiesById;
        Object.keys(entitiesById).forEach((entityId) => {
            const entity = entitiesById[entityId];
            if (!this.entitiesByType[entity.typename]) {
                this.entitiesByType[entity.typename] = {};
            }
            this.entitiesByType[entity.typename][entityId] = entity;
        });
    }
    extract() {
        const { entitiesById, entitiesByType } = this;
        return {
            entitiesById,
            entitiesByType,
        };
    }
    clear() {
        this.entitiesById = {};
        this.entitiesByType = {};
    }
}
exports.default = EntityTypeMap;
//# sourceMappingURL=EntityTypeMap.js.map