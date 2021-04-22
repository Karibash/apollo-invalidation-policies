export declare function isQuery(dataId: string): boolean;
/**
 * Returns a store entity ID matching the path at which the entity is found in the entity store.
 * For a store entity of a normalized type, the entity ID would be the data ID:
 * ex. Employee:1
 * For a store entity of a query, the entity ID would be the root operation plus the field name if specified:
 * ex. ROOT_QUERY.employees
 */
export declare function makeEntityId(dataId: string, fieldName?: string | null): string;
export declare const maybeDeepClone: (obj: any) => any;
export declare var TypeOrFieldNameRegExp: RegExp;
export declare function fieldNameFromStoreName(storeFieldName: string): string;
//# sourceMappingURL=helpers.d.ts.map