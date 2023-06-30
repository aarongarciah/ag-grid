// Type definitions for @ag-grid-community/core v30.0.3
// Project: https://www.ag-grid.com/
// Definitions by: Niall Crosby <https://github.com/ag-grid/>
import { BeanStub } from '../context/beanStub';
import { ColDef } from '../entities/colDef';
import { Column } from '../entities/column';
export declare class DataTypeService extends BeanStub {
    private rowModel;
    private columnModel;
    private valueService;
    private valueFormatterService;
    private dataTypeDefinitions;
    private dataTypeMatchers;
    private isWaitingForRowData;
    private hasObjectValueParser;
    private hasObjectValueFormatter;
    private groupHideOpenParents;
    init(): void;
    private processDataTypeDefinitions;
    private mergeDataTypeDefinitions;
    private processDataTypeDefinition;
    private validateDataTypeDefinition;
    private createGroupSafeValueFormatter;
    private updateColDefAndGetDataTypeDefinitionColumnType;
    updateColDefAndGetColumnType(colDef: ColDef, userColDef: ColDef, colId: string): string[] | undefined;
    private canInferCellDataType;
    private doColDefPropsPreventInference;
    private doesColDefPropPreventInference;
    private inferCellDataType;
    private initWaitForRowData;
    private checkObjectValueHandlers;
    convertColumnTypes(type: string | string[]): string[];
    private getDateStringTypeDefinition;
    getDateParserFunction(): (value: string | undefined) => Date | undefined;
    getDateFormatterFunction(): (value: Date | undefined) => string | undefined;
    checkType(column: Column, value: any): boolean;
    validateColDef(colDef: ColDef): void;
    private setColDefPropertiesForBaseDataType;
    private getDefaultDataTypes;
}
