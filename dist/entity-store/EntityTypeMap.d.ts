import { EntitiesById, ExtractedTypeMap, TypeMapEntities, TypeMapEntity } from "./types";
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
export default class EntityTypeMap {
    private entitiesByType;
    private entitiesById;
    write(typename: string, dataId: string, storeFieldName?: string | null, variables?: Record<string, any>): void;
    evict(dataId: string, storeFieldName?: string): void;
    readEntitiesByType(typeName: string): TypeMapEntities | null;
    readEntityById(entityId: string): TypeMapEntity | null;
    renewEntity(dataId: string, storeFieldName?: string): void;
    restore(entitiesById: EntitiesById): void;
    extract(): ExtractedTypeMap;
    clear(): void;
}
//# sourceMappingURL=EntityTypeMap.d.ts.map