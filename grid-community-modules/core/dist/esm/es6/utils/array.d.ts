// Type definitions for @ag-grid-community/core v30.0.3
// Project: https://www.ag-grid.com/
// Definitions by: Niall Crosby <https://github.com/ag-grid/>
export declare function firstExistingValue<A>(...values: A[]): A | null;
export declare function existsAndNotEmpty<T>(value?: T[]): boolean;
export declare function last<T>(arr: T[]): T;
export declare function last<T extends Node>(arr: NodeListOf<T>): T;
export declare function areEqual<T>(a?: T[] | null, b?: T[] | null, comparator?: (a: T, b: T) => boolean): boolean;
/** @deprecated */
export declare function shallowCompare(arr1: any[], arr2: any[]): boolean;
export declare function sortNumerically(array: number[]): number[];
export declare function removeRepeatsFromArray<T>(array: T[], object: T): void;
export declare function removeFromArray<T>(array: T[], object: T): void;
export declare function removeAllFromArray<T>(array: T[], toRemove: T[]): void;
export declare function insertIntoArray<T>(array: T[], object: T, toIndex: number): void;
export declare function insertArrayIntoArray<T>(dest: T[], src: T[], toIndex: number): void;
export declare function moveInArray<T>(array: T[], objectsToMove: T[], toIndex: number): void;
export declare function includes<T>(array: T[], value: T): boolean;
export declare function flatten(arrayOfArrays: any[]): any[];
export declare function pushAll<T>(target: T[], source: T[]): void;
export declare function toStrings<T>(array: T[]): ((string | null)[]) | null;
export declare function forEachReverse<T>(list: T[], action: (value: T, index: number) => void): void;
