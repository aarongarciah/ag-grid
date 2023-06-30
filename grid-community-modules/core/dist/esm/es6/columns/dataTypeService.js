/**
 * @ag-grid-community/core - Advanced Data Grid / Data Table supporting Javascript / Typescript / React / Angular / Vue
 * @version v30.0.3
 * @link https://www.ag-grid.com/
 * @license MIT
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Autowired, Bean, PostConstruct } from '../context/context';
import { BeanStub } from '../context/beanStub';
import { Events } from '../eventKeys';
import { getValueUsingField } from '../utils/object';
import { ModuleRegistry } from '../modules/moduleRegistry';
import { ModuleNames } from '../modules/moduleNames';
import { doOnce } from '../utils/function';
import { KeyCode } from '../constants/keyCode';
import { exists, toStringOrNull } from '../utils/generic';
import { parseDateTimeFromString, serialiseDate } from '../utils/date';
const MONTH_LOCALE_TEXT = {
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December'
};
const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
let DataTypeService = class DataTypeService extends BeanStub {
    constructor() {
        super(...arguments);
        this.dataTypeDefinitions = {};
        this.isWaitingForRowData = false;
    }
    init() {
        this.groupHideOpenParents = this.gridOptionsService.is('groupHideOpenParents');
        this.addManagedPropertyListener('groupHideOpenParents', () => {
            this.groupHideOpenParents = this.gridOptionsService.is('groupHideOpenParents');
        });
        this.processDataTypeDefinitions();
        this.addManagedPropertyListener('dataTypeDefinitions', () => {
            this.processDataTypeDefinitions();
            this.columnModel.recreateColumnDefs('gridOptionsChanged');
        });
    }
    processDataTypeDefinitions() {
        var _a;
        const defaultDataTypes = this.getDefaultDataTypes();
        this.dataTypeDefinitions = {};
        Object.entries(defaultDataTypes).forEach(([cellDataType, dataTypeDefinition]) => {
            this.dataTypeDefinitions[cellDataType] = Object.assign(Object.assign({}, dataTypeDefinition), { groupSafeValueFormatter: this.createGroupSafeValueFormatter(dataTypeDefinition) });
        });
        const dataTypeDefinitions = (_a = this.gridOptionsService.get('dataTypeDefinitions')) !== null && _a !== void 0 ? _a : {};
        this.dataTypeMatchers = {};
        Object.entries(dataTypeDefinitions).forEach(([cellDataType, dataTypeDefinition]) => {
            const mergedDataTypeDefinition = this.processDataTypeDefinition(dataTypeDefinition, dataTypeDefinitions, [cellDataType], defaultDataTypes);
            if (mergedDataTypeDefinition) {
                this.dataTypeDefinitions[cellDataType] = mergedDataTypeDefinition;
                if (dataTypeDefinition.dataTypeMatcher) {
                    this.dataTypeMatchers[cellDataType] = dataTypeDefinition.dataTypeMatcher;
                }
            }
        });
        this.checkObjectValueHandlers(defaultDataTypes);
        ['dateString', 'text', 'number', 'boolean', 'date'].forEach((cellDataType) => {
            const overriddenDataTypeMatcher = this.dataTypeMatchers[cellDataType];
            if (overriddenDataTypeMatcher) {
                // remove to maintain correct ordering
                delete this.dataTypeMatchers[cellDataType];
            }
            this.dataTypeMatchers[cellDataType] = overriddenDataTypeMatcher !== null && overriddenDataTypeMatcher !== void 0 ? overriddenDataTypeMatcher : defaultDataTypes[cellDataType].dataTypeMatcher;
        });
    }
    mergeDataTypeDefinitions(parentDataTypeDefinition, childDataTypeDefinition) {
        const mergedDataTypeDefinition = Object.assign(Object.assign({}, parentDataTypeDefinition), childDataTypeDefinition);
        if (parentDataTypeDefinition.columnTypes &&
            childDataTypeDefinition.columnTypes &&
            childDataTypeDefinition.appendColumnTypes) {
            mergedDataTypeDefinition.columnTypes = [
                ...this.convertColumnTypes(parentDataTypeDefinition.columnTypes),
                ...this.convertColumnTypes(childDataTypeDefinition.columnTypes),
            ];
        }
        return mergedDataTypeDefinition;
    }
    processDataTypeDefinition(dataTypeDefinition, dataTypeDefinitions, alreadyProcessedDataTypes, defaultDataTypes) {
        let mergedDataTypeDefinition;
        const extendsCellDataType = dataTypeDefinition.extendsDataType;
        if (dataTypeDefinition.extendsDataType === dataTypeDefinition.baseDataType) {
            const baseDataTypeDefinition = defaultDataTypes[extendsCellDataType];
            if (!this.validateDataTypeDefinition(dataTypeDefinition, baseDataTypeDefinition, extendsCellDataType)) {
                return undefined;
            }
            mergedDataTypeDefinition = this.mergeDataTypeDefinitions(baseDataTypeDefinition, dataTypeDefinition);
        }
        else {
            if (alreadyProcessedDataTypes.includes(extendsCellDataType)) {
                doOnce(() => console.warn('AG Grid: Data type definition hierarchies (via the "extendsDataType" property) cannot contain circular references.'), 'dataTypeExtendsCircularRef');
                return undefined;
            }
            const extendedDataTypeDefinition = dataTypeDefinitions[extendsCellDataType];
            if (!this.validateDataTypeDefinition(dataTypeDefinition, extendedDataTypeDefinition, extendsCellDataType)) {
                return undefined;
            }
            const mergedExtendedDataTypeDefinition = this.processDataTypeDefinition(extendedDataTypeDefinition, dataTypeDefinitions, [...alreadyProcessedDataTypes, extendsCellDataType], defaultDataTypes);
            if (!mergedExtendedDataTypeDefinition) {
                return undefined;
            }
            mergedDataTypeDefinition = this.mergeDataTypeDefinitions(mergedExtendedDataTypeDefinition, dataTypeDefinition);
        }
        return Object.assign(Object.assign({}, mergedDataTypeDefinition), { groupSafeValueFormatter: this.createGroupSafeValueFormatter(mergedDataTypeDefinition) });
    }
    validateDataTypeDefinition(dataTypeDefinition, parentDataTypeDefinition, parentCellDataType) {
        if (!parentDataTypeDefinition) {
            doOnce(() => console.warn(`AG Grid: The data type definition ${parentCellDataType} does not exist.`), 'dataTypeDefMissing' + parentCellDataType);
            return false;
        }
        if (parentDataTypeDefinition.baseDataType !== dataTypeDefinition.baseDataType) {
            doOnce(() => console.warn('AG Grid: The "baseDataType" property of a data type definition must match that of its parent.'), 'dataTypeBaseTypesMatch');
            return false;
        }
        return true;
    }
    createGroupSafeValueFormatter(dataTypeDefinition) {
        if (!dataTypeDefinition.valueFormatter) {
            return undefined;
        }
        return (params) => {
            var _a, _b;
            if ((_a = params.node) === null || _a === void 0 ? void 0 : _a.group) {
                const aggFunc = params.column.getAggFunc();
                if (aggFunc) {
                    // the resulting type of these will be the same, so we call valueFormatter anyway
                    if (aggFunc === 'first' || aggFunc === 'last') {
                        return dataTypeDefinition.valueFormatter(params);
                    }
                    if (dataTypeDefinition.baseDataType === 'number' && aggFunc !== 'count') {
                        if (typeof params.value === 'number') {
                            return dataTypeDefinition.valueFormatter(params);
                        }
                        if (typeof params.value === 'object') {
                            if (!params.value) {
                                return undefined;
                            }
                            if ('toNumber' in params.value) {
                                return dataTypeDefinition.valueFormatter(Object.assign(Object.assign({}, params), { value: params.value.toNumber() }));
                            }
                            if ('value' in params.value) {
                                return dataTypeDefinition.valueFormatter(Object.assign(Object.assign({}, params), { value: params.value.value }));
                            }
                        }
                    }
                }
                return undefined;
            }
            else if (this.groupHideOpenParents && params.column.isRowGroupActive()) {
                // `groupHideOpenParents` passes leaf values in the group column, so need to format still.
                // If it's not a string, we know it hasn't been formatted. Otherwise check the data type matcher.
                if (typeof params.value !== 'string' || ((_b = dataTypeDefinition.dataTypeMatcher) === null || _b === void 0 ? void 0 : _b.call(dataTypeDefinition, params.value))) {
                    return dataTypeDefinition.valueFormatter(params);
                }
                return undefined;
            }
            return dataTypeDefinition.valueFormatter(params);
        };
    }
    updateColDefAndGetDataTypeDefinitionColumnType(colDef, userColDef, colId) {
        let { cellDataType } = userColDef;
        const { field } = userColDef;
        if (cellDataType === undefined) {
            cellDataType = colDef.cellDataType;
        }
        if ((cellDataType == null || cellDataType === true)) {
            cellDataType = this.canInferCellDataType(colDef, userColDef) ? this.inferCellDataType(field) : false;
        }
        if (!cellDataType) {
            colDef.cellDataType = false;
            return undefined;
        }
        const dataTypeDefinition = this.dataTypeDefinitions[cellDataType];
        if (!dataTypeDefinition) {
            doOnce(() => console.warn(`AG Grid: Missing data type definition - "${cellDataType}"`), 'dataTypeMissing' + cellDataType);
            return undefined;
        }
        colDef.cellDataType = cellDataType;
        if (dataTypeDefinition.groupSafeValueFormatter) {
            colDef.valueFormatter = dataTypeDefinition.groupSafeValueFormatter;
        }
        if (dataTypeDefinition.valueParser) {
            colDef.valueParser = dataTypeDefinition.valueParser;
        }
        if (!dataTypeDefinition.suppressDefaultProperties) {
            this.setColDefPropertiesForBaseDataType(colDef, dataTypeDefinition, colId);
        }
        return dataTypeDefinition.columnTypes;
    }
    updateColDefAndGetColumnType(colDef, userColDef, colId) {
        var _a, _b;
        const dataTypeDefinitionColumnType = this.updateColDefAndGetDataTypeDefinitionColumnType(colDef, userColDef, colId);
        const columnTypes = (_b = (_a = userColDef.type) !== null && _a !== void 0 ? _a : dataTypeDefinitionColumnType) !== null && _b !== void 0 ? _b : colDef.type;
        return columnTypes ? this.convertColumnTypes(columnTypes) : undefined;
    }
    canInferCellDataType(colDef, userColDef) {
        var _a;
        if (this.rowModel.getType() !== 'clientSide') {
            return false;
        }
        const propsToCheckForInference = { cellRenderer: true, valueGetter: true, valueParser: true, refData: true };
        if (this.doColDefPropsPreventInference(userColDef, propsToCheckForInference)) {
            return false;
        }
        const columnTypes = userColDef.type === null ? colDef.type : userColDef.type;
        if (columnTypes) {
            const columnTypeDefs = (_a = this.gridOptionsService.get('columnTypes')) !== null && _a !== void 0 ? _a : {};
            const hasPropsPreventingInference = this.convertColumnTypes(columnTypes).some(columnType => {
                const columnTypeDef = columnTypeDefs[columnType.trim()];
                return columnTypeDef && this.doColDefPropsPreventInference(columnTypeDef, propsToCheckForInference);
            });
            if (hasPropsPreventingInference) {
                return false;
            }
        }
        return !this.doColDefPropsPreventInference(colDef, propsToCheckForInference);
    }
    doColDefPropsPreventInference(colDef, propsToCheckForInference) {
        return [
            ['cellRenderer', 'agSparklineCellRenderer'], ['valueGetter', undefined], ['valueParser', undefined], ['refData', undefined]
        ].some(([prop, comparisonValue]) => this.doesColDefPropPreventInference(colDef, propsToCheckForInference, prop, comparisonValue));
    }
    doesColDefPropPreventInference(colDef, checkProps, prop, comparisonValue) {
        if (!checkProps[prop]) {
            return false;
        }
        const value = colDef[prop];
        if (value === null) {
            checkProps[prop] = false;
            return false;
        }
        else {
            return comparisonValue === undefined ? !!value : value === comparisonValue;
        }
    }
    inferCellDataType(field) {
        var _a;
        if (!field) {
            return undefined;
        }
        const rowData = this.gridOptionsService.get('rowData');
        let value;
        const fieldContainsDots = field.indexOf('.') >= 0 && !this.gridOptionsService.is('suppressFieldDotNotation');
        if (rowData === null || rowData === void 0 ? void 0 : rowData.length) {
            value = getValueUsingField(rowData[0], field, fieldContainsDots);
        }
        else {
            const rowNodes = this.rowModel
                .getRootNode()
                .allLeafChildren;
            if (rowNodes === null || rowNodes === void 0 ? void 0 : rowNodes.length) {
                value = getValueUsingField(rowNodes[0].data, field, fieldContainsDots);
            }
            else {
                this.initWaitForRowData();
            }
        }
        if (value == null) {
            return undefined;
        }
        const [cellDataType] = (_a = Object.entries(this.dataTypeMatchers).find(([_cellDataType, dataTypeMatcher]) => dataTypeMatcher(value))) !== null && _a !== void 0 ? _a : ['object'];
        return cellDataType;
    }
    initWaitForRowData() {
        if (this.isWaitingForRowData) {
            return;
        }
        this.isWaitingForRowData = true;
        const destroyFunc = this.addManagedListener(this.eventService, Events.EVENT_ROW_DATA_UPDATED, () => {
            destroyFunc === null || destroyFunc === void 0 ? void 0 : destroyFunc();
            this.isWaitingForRowData = false;
            setTimeout(() => {
                // ensure event handled async
                this.columnModel.recreateColumnDefs('rowDataUpdated');
            });
        });
    }
    checkObjectValueHandlers(defaultDataTypes) {
        const resolvedObjectDataTypeDefinition = this.dataTypeDefinitions.object;
        const defaultObjectDataTypeDefinition = defaultDataTypes.object;
        this.hasObjectValueParser = resolvedObjectDataTypeDefinition.valueParser !== defaultObjectDataTypeDefinition.valueParser;
        this.hasObjectValueFormatter = resolvedObjectDataTypeDefinition.valueFormatter !== defaultObjectDataTypeDefinition.valueFormatter;
    }
    convertColumnTypes(type) {
        let typeKeys = [];
        if (type instanceof Array) {
            const invalidArray = type.some((a) => typeof a !== 'string');
            if (invalidArray) {
                console.warn("AG Grid: if colDef.type is supplied an array it should be of type 'string[]'");
            }
            else {
                typeKeys = type;
            }
        }
        else if (typeof type === 'string') {
            typeKeys = type.split(',');
        }
        else {
            console.warn("AG Grid: colDef.type should be of type 'string' | 'string[]'");
        }
        return typeKeys;
    }
    getDateStringTypeDefinition() {
        return this.dataTypeDefinitions.dateString;
    }
    getDateParserFunction() {
        return this.getDateStringTypeDefinition().dateParser;
    }
    getDateFormatterFunction() {
        return this.getDateStringTypeDefinition().dateFormatter;
    }
    checkType(column, value) {
        var _a;
        const colDef = column.getColDef();
        if (!colDef.cellDataType || value == null) {
            return true;
        }
        const dataTypeMatcher = (_a = this.dataTypeDefinitions[colDef.cellDataType]) === null || _a === void 0 ? void 0 : _a.dataTypeMatcher;
        if (!dataTypeMatcher) {
            return true;
        }
        return dataTypeMatcher(value);
    }
    validateColDef(colDef) {
        if (colDef.cellDataType === 'object') {
            if (colDef.valueFormatter === this.dataTypeDefinitions.object.groupSafeValueFormatter && !this.hasObjectValueFormatter) {
                doOnce(() => console.warn('AG Grid: Cell data type is "object" but no value formatter has been provided. Please either provide an object data type definition with a value formatter, or set "colDef.valueFormatter"'), 'dataTypeObjectValueFormatter');
            }
            if (colDef.editable && colDef.valueParser === this.dataTypeDefinitions.object.valueParser && !this.hasObjectValueParser) {
                doOnce(() => console.warn('AG Grid: Cell data type is "object" but no value parser has been provided. Please either provide an object data type definition with a value parser, or set "colDef.valueParser"'), 'dataTypeObjectValueParser');
            }
        }
    }
    setColDefPropertiesForBaseDataType(colDef, dataTypeDefinition, colId) {
        const formatValue = (column, node, value) => {
            let valueFormatter = column.getColDef().valueFormatter;
            if (valueFormatter === dataTypeDefinition.groupSafeValueFormatter) {
                valueFormatter = dataTypeDefinition.valueFormatter;
            }
            return this.valueFormatterService.formatValue(column, node, value, valueFormatter);
        };
        const usingSetFilter = ModuleRegistry.isRegistered(ModuleNames.SetFilterModule, this.context.getGridId());
        const translate = this.localeService.getLocaleTextFunc();
        colDef.useValueFormatterForExport = true;
        colDef.useValueParserForImport = true;
        switch (dataTypeDefinition.baseDataType) {
            case 'number': {
                colDef.cellEditor = 'agNumberCellEditor';
                if (usingSetFilter) {
                    colDef.filterParams = {
                        comparator: (a, b) => {
                            const valA = a == null ? 0 : parseInt(a);
                            const valB = b == null ? 0 : parseInt(b);
                            if (valA === valB)
                                return 0;
                            return valA > valB ? 1 : -1;
                        },
                    };
                }
                break;
            }
            case 'boolean': {
                colDef.cellEditor = 'agCheckboxCellEditor';
                colDef.cellRenderer = 'agCheckboxCellRenderer';
                colDef.suppressKeyboardEvent = (params) => !!params.colDef.editable && params.event.key === KeyCode.SPACE;
                if (usingSetFilter) {
                    colDef.filterParams = {
                        valueFormatter: (params) => {
                            if (!exists(params.value)) {
                                return translate('blanks', '(Blanks)');
                            }
                            return translate(String(params.value), params.value ? 'True' : 'False');
                        }
                    };
                }
                else {
                    colDef.filterParams = {
                        maxNumConditions: 1,
                        filterOptions: [
                            'empty',
                            {
                                displayKey: 'true',
                                displayName: 'True',
                                predicate: (_filterValues, cellValue) => cellValue,
                                numberOfInputs: 0,
                            },
                            {
                                displayKey: 'false',
                                displayName: 'False',
                                predicate: (_filterValues, cellValue) => cellValue === false,
                                numberOfInputs: 0,
                            },
                        ]
                    };
                }
                break;
            }
            case 'date': {
                colDef.cellEditor = 'agDateCellEditor';
                colDef.keyCreator = (params) => formatValue(params.column, params.node, params.value);
                if (usingSetFilter) {
                    colDef.filterParams = {
                        valueFormatter: (params) => {
                            const valueFormatted = formatValue(params.column, params.node, params.value);
                            return exists(valueFormatted) ? valueFormatted : translate('blanks', '(Blanks)');
                        },
                        treeList: true,
                        treeListFormatter: (pathKey, level) => {
                            if (level === 1 && pathKey != null) {
                                const monthKey = MONTH_KEYS[Number(pathKey) - 1];
                                return translate(monthKey, MONTH_LOCALE_TEXT[monthKey]);
                            }
                            return pathKey !== null && pathKey !== void 0 ? pathKey : translate('blanks', '(Blanks)');
                        }
                    };
                }
                break;
            }
            case 'dateString': {
                colDef.cellEditor = 'agDateStringCellEditor';
                colDef.keyCreator = (params) => formatValue(params.column, params.node, params.value);
                const convertToDate = this.getDateParserFunction();
                if (usingSetFilter) {
                    colDef.filterParams = {
                        valueFormatter: (params) => {
                            const valueFormatted = formatValue(params.column, params.node, params.value);
                            return exists(valueFormatted) ? valueFormatted : translate('blanks', '(Blanks)');
                        },
                        treeList: true,
                        treeListPathGetter: (value) => {
                            const date = convertToDate(value !== null && value !== void 0 ? value : undefined);
                            return date ? [String(date.getFullYear()), String(date.getMonth() + 1), String(date.getDate())] : null;
                        },
                        treeListFormatter: (pathKey, level) => {
                            if (level === 1 && pathKey != null) {
                                const monthKey = MONTH_KEYS[Number(pathKey) - 1];
                                return translate(monthKey, MONTH_LOCALE_TEXT[monthKey]);
                            }
                            return pathKey !== null && pathKey !== void 0 ? pathKey : translate('blanks', '(Blanks)');
                        }
                    };
                }
                else {
                    colDef.filterParams = {
                        comparator: (filterDate, cellValue) => {
                            const cellAsDate = convertToDate(cellValue);
                            if (cellValue == null || cellAsDate < filterDate) {
                                return -1;
                            }
                            if (cellAsDate > filterDate) {
                                return 1;
                            }
                            return 0;
                        }
                    };
                }
                break;
            }
            case 'object': {
                colDef.cellEditorParams = {
                    useFormatter: true,
                };
                colDef.comparator = (a, b) => {
                    const column = this.columnModel.getPrimaryColumn(colId);
                    const colDef = column === null || column === void 0 ? void 0 : column.getColDef();
                    if (!column || !colDef) {
                        return 0;
                    }
                    const valA = a == null ? '' : formatValue(column, null, a);
                    const valB = b == null ? '' : formatValue(column, null, b);
                    if (valA === valB)
                        return 0;
                    return valA > valB ? 1 : -1;
                };
                colDef.keyCreator = (params) => formatValue(params.column, params.node, params.value);
                if (usingSetFilter) {
                    colDef.filterParams = {
                        valueFormatter: (params) => {
                            const valueFormatted = formatValue(params.column, params.node, params.value);
                            return exists(valueFormatted) ? valueFormatted : translate('blanks', '(Blanks)');
                        }
                    };
                }
                else {
                    colDef.filterValueGetter = (params) => formatValue(params.column, params.node, this.valueService.getValue(params.column, params.node));
                }
                break;
            }
        }
    }
    getDefaultDataTypes() {
        const defaultDateFormatMatcher = (value) => !!value.match('\\d{4}-\\d{2}-\\d{2}');
        const translate = this.localeService.getLocaleTextFunc();
        return {
            number: {
                baseDataType: 'number',
                valueParser: (params) => params.newValue === '' ? null : Number(params.newValue),
                valueFormatter: (params) => {
                    if (params.value == null) {
                        return '';
                    }
                    if (typeof params.value !== 'number' || isNaN(params.value)) {
                        return translate('invalidNumber', 'Invalid Number');
                    }
                    return String(params.value);
                },
                dataTypeMatcher: (value) => typeof value === 'number',
            },
            text: {
                baseDataType: 'text',
                valueParser: (params) => params.newValue === '' ? null : toStringOrNull(params.newValue),
                dataTypeMatcher: (value) => typeof value === 'string',
            },
            boolean: {
                baseDataType: 'boolean',
                valueParser: (params) => params.newValue === '' ? null : String(params.newValue).toLowerCase() === 'true',
                valueFormatter: (params) => params.value == null ? '' : String(params.value),
                dataTypeMatcher: (value) => typeof value === 'boolean',
            },
            date: {
                baseDataType: 'date',
                valueParser: (params) => parseDateTimeFromString(params.newValue == null ? null : String(params.newValue)),
                valueFormatter: (params) => {
                    var _a;
                    if (params.value == null) {
                        return '';
                    }
                    if (!(params.value instanceof Date) || isNaN(params.value.getTime())) {
                        return translate('invalidDate', 'Invalid Date');
                    }
                    return (_a = serialiseDate(params.value, false)) !== null && _a !== void 0 ? _a : '';
                },
                dataTypeMatcher: (value) => value instanceof Date,
            },
            dateString: {
                baseDataType: 'dateString',
                dateParser: (value) => { var _a; return (_a = parseDateTimeFromString(value)) !== null && _a !== void 0 ? _a : undefined; },
                dateFormatter: (value) => { var _a; return (_a = serialiseDate(value !== null && value !== void 0 ? value : null, false)) !== null && _a !== void 0 ? _a : undefined; },
                valueParser: (params) => defaultDateFormatMatcher(String(params.newValue)) ? params.newValue : null,
                valueFormatter: (params) => defaultDateFormatMatcher(String(params.value)) ? params.value : '',
                dataTypeMatcher: (value) => typeof value === 'string' && defaultDateFormatMatcher(value),
            },
            object: {
                baseDataType: 'object',
                valueParser: () => null,
                valueFormatter: (params) => { var _a; return (_a = toStringOrNull(params.value)) !== null && _a !== void 0 ? _a : ''; },
            }
        };
    }
};
__decorate([
    Autowired('rowModel')
], DataTypeService.prototype, "rowModel", void 0);
__decorate([
    Autowired('columnModel')
], DataTypeService.prototype, "columnModel", void 0);
__decorate([
    Autowired('valueService')
], DataTypeService.prototype, "valueService", void 0);
__decorate([
    Autowired('valueFormatterService')
], DataTypeService.prototype, "valueFormatterService", void 0);
__decorate([
    PostConstruct
], DataTypeService.prototype, "init", null);
DataTypeService = __decorate([
    Bean('dataTypeService')
], DataTypeService);
export { DataTypeService };
