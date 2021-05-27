import { GridOptions } from "./entities/gridOptions";
import { GridOptionsWrapper } from "./gridOptionsWrapper";
import { SelectionController } from "./selectionController";
import { ColumnApi } from "./columnController/columnApi";
import { ColumnModel } from "./columnController/columnModel";
import { RowRenderer } from "./rendering/rowRenderer";
import { HeaderRootComp } from "./headerRendering/headerRootComp";
import { FilterManager } from "./filter/filterManager";
import { ValueService } from "./valueService/valueService";
import { EventService } from "./eventService";
import { GridBodyComp } from "./gridBodyComp/gridBodyComp";
import { GridApi } from "./gridApi";
import { ColumnFactory } from "./columnController/columnFactory";
import { DisplayedGroupCreator } from "./columnController/displayedGroupCreator";
import { ExpressionService } from "./valueService/expressionService";
import { TemplateService } from "./templateService";
import { PopupService } from "./widgets/popupService";
import { Logger, LoggerFactory } from "./logger";
import { ColumnUtils } from "./columnController/columnUtils";
import { AutoWidthCalculator } from "./rendering/autoWidthCalculator";
import { HorizontalResizeService } from "./headerRendering/horizontalResizeService";
import { ComponentMeta, Context, ContextParams } from "./context/context";
import { GridComp } from "./gridComp/gridComp";
import { StandardMenuFactory } from "./headerRendering/standardMenu";
import { DragAndDropService } from "./dragAndDrop/dragAndDropService";
import { DragService } from "./dragAndDrop/dragService";
import { SortController } from "./sortController";
import { FocusController } from "./focusController";
import { MouseEventService } from "./gridBodyComp/mouseEventService";
import { CellNavigationService } from "./cellNavigationService";
import { Events, GridReadyEvent } from "./events";
import { ValueFormatterService } from "./rendering/valueFormatterService";
import { AgCheckbox } from "./widgets/agCheckbox";
import { AgRadioButton } from "./widgets/agRadioButton";
import { VanillaFrameworkOverrides } from "./vanillaFrameworkOverrides";
import { IFrameworkOverrides } from "./interfaces/iFrameworkOverrides";
import { ScrollVisibleService } from "./gridBodyComp/scrollVisibleService";
import { StylingService } from "./styling/stylingService";
import { ColumnHoverService } from "./rendering/columnHoverService";
import { ColumnAnimationService } from "./rendering/columnAnimationService";
import { AutoGroupColService } from "./columnController/autoGroupColService";
import { PaginationProxy } from "./pagination/paginationProxy";
import { PaginationAutoPageSizeService } from "./pagination/paginationAutoPageSizeService";
import { IRowModel } from "./interfaces/iRowModel";
import { Constants } from "./constants/constants";
import { ValueCache } from "./valueService/valueCache";
import { ChangeDetectionService } from "./valueService/changeDetectionService";
import { AlignedGridsService } from "./alignedGridsService";
import { UserComponentFactory } from "./components/framework/userComponentFactory";
import { AgGridRegisteredComponentInput, UserComponentRegistry } from "./components/framework/userComponentRegistry";
import { AgComponentUtils } from "./components/framework/agComponentUtils";
import { ComponentMetadataProvider } from "./components/framework/componentMetadataProvider";
import { Beans } from "./rendering/beans";
import { Environment } from "./environment";
import { AnimationFrameService } from "./misc/animationFrameService";
import { NavigationService } from "./gridBodyComp/navigationService";
import { RowContainerHeightService } from "./rendering/rowContainerHeightService";
import { SelectableService } from "./rowNodes/selectableService";
import { AutoHeightCalculator } from "./rendering/row/autoHeightCalculator";
import { PaginationComp } from "./pagination/paginationComp";
import { ResizeObserverService } from "./misc/resizeObserverService";
import { OverlayWrapperComponent } from "./rendering/overlays/overlayWrapperComponent";
import { Module } from "./interfaces/iModule";
import { AgGroupComponent } from "./widgets/agGroupComponent";
import { AgDialog } from "./widgets/agDialog";
import { AgPanel } from "./widgets/agPanel";
import { AgInputTextField } from "./widgets/agInputTextField";
import { AgInputTextArea } from "./widgets/agInputTextArea";
import { AgSlider } from "./widgets/agSlider";
import { AgColorPicker } from "./widgets/agColorPicker";
import { AgInputNumberField } from "./widgets/agInputNumberField";
import { AgInputRange } from "./widgets/agInputRange";
import { AgSelect } from "./widgets/agSelect";
import { AgAngleSelect } from "./widgets/agAngleSelect";
import { AgToggleButton } from "./widgets/agToggleButton";
import { DetailRowCompCache } from "./rendering/row/detailRowCompCache";
import { RowPositionUtils } from "./entities/rowPosition";
import { CellPositionUtils } from "./entities/cellPosition";
import { PinnedRowModel } from "./pinnedRowModel/pinnedRowModel";
import { IComponent } from "./interfaces/iComponent";
import { ModuleRegistry } from "./modules/moduleRegistry";
import { ModuleNames } from "./modules/moduleNames";
import { UndoRedoService } from "./undoRedo/undoRedoService";
import { AgStackComponentsRegistry } from "./components/agStackComponentsRegistry";
import { HeaderPositionUtils } from "./headerRendering/header/headerPosition";
import { HeaderNavigationService } from "./headerRendering/header/headerNavigationService";
import { exists, missing } from "./utils/generic";
import { assign, iterateObject } from "./utils/object";
import { ColumnDefFactory } from "./columnController/columnDefFactory";
import { RowCssClassCalculator } from "./rendering/row/rowCssClassCalculator";
import { RowNodeBlockLoader } from "./rowNodeCache/rowNodeBlockLoader";
import { RowNodeSorter } from "./rowNodes/rowNodeSorter";
import { ControllersService } from "./controllersService";
import { FakeHScrollComp } from "./gridBodyComp/fakeHScrollComp";
import { PinnedWidthService } from "./gridBodyComp/pinnedWidthService";
import { RowContainerComp } from "./gridBodyComp/rowContainer/rowContainerComp";

export interface GridParams {
    // used by Web Components
    globalEventListener?: Function;

    // these are used by ng1 only
    $scope?: any;
    $compile?: any;

    // this allows the base frameworks (React, NG2, etc) to provide alternative cellRenderers and cellEditors
    frameworkOverrides?: IFrameworkOverrides;

    // bean instances to add to the context
    providedBeanInstances?: { [key: string]: any; };

    modules?: Module[];
}

// creates JavaScript vanilla Grid, including JavaScript (ag-stack) components, which can
// be wrapped by the framework wrappers
export class Grid {

    protected logger: Logger;

    private readonly gridOptions: GridOptions;

    constructor(eGridDiv: HTMLElement, gridOptions: GridOptions, params?: GridParams) {

        if (!gridOptions) {
            console.error('AG Grid: no gridOptions provided to the grid');
            return;
        }

        this.gridOptions = gridOptions;

        new GridCoreCreator().create(eGridDiv, gridOptions, context => {
            const gridComp = new GridComp(eGridDiv);
            context.createBean(gridComp);
        }, params);
    }

    public destroy(): void {
        if (this.gridOptions && this.gridOptions.api) {
            this.gridOptions.api.destroy();
        }
    }
}

// created services of grid only, no UI, so frameworks can use this if providing
// their own UI
export class GridCoreCreator {

    public create(eGridDiv: HTMLElement, gridOptions: GridOptions, uiCallback: (context: Context) => void, params?: GridParams): void {

        const debug = !!gridOptions.debug;

        const registeredModules = this.getRegisteredModules(params);

        const beanClasses = this.createBeansList(gridOptions.rowModelType, registeredModules);
        const providedBeanInstances = this.createProvidedBeans(eGridDiv, gridOptions, params);

        if (!beanClasses) { return; } // happens when no row model found

        const contextParams: ContextParams = {
            providedBeanInstances: providedBeanInstances,
            beanClasses: beanClasses,
            debug: debug
        };

        const logger = new Logger('AG Grid', () => gridOptions.debug);
        const contextLogger = new Logger('Context', () => contextParams.debug);
        const context = new Context(contextParams, contextLogger);

        this.registerModuleUserComponents(context, registeredModules);
        this.registerStackComponents(context, registeredModules);

        uiCallback(context);

        this.setColumnsAndData(context);
        this.dispatchGridReadyEvent(context, gridOptions);
        const isEnterprise = ModuleRegistry.isRegistered(ModuleNames.EnterpriseCoreModule);
        logger.log(`initialised successfully, enterprise = ${isEnterprise}`);
    }

    private registerStackComponents(context: Context, registeredModules: Module[]): void {
        const agStackComponents = this.createAgStackComponentsList(registeredModules);
        const agStackComponentsRegistry =
            context.getBean('agStackComponentsRegistry') as AgStackComponentsRegistry;
        agStackComponentsRegistry.setupComponents(agStackComponents);
    }

    private getRegisteredModules(params?: GridParams): Module[] {
        const passedViaConstructor: Module[] | undefined | null = params ? params.modules : null;
        const registered = ModuleRegistry.getRegisteredModules();

        const allModules: Module[] = [];
        const mapNames: { [name: string]: boolean; } = {};

        // adds to list and removes duplicates
        function addModule(moduleBased: boolean, mod: Module) {
            function addIndividualModule(currentModule: Module) {
                if (!mapNames[currentModule.moduleName]) {
                    mapNames[currentModule.moduleName] = true;
                    allModules.push(currentModule);
                    ModuleRegistry.register(currentModule, moduleBased);
                }
            }

            addIndividualModule(mod);
            if (mod.dependantModules) {
                mod.dependantModules.forEach(addModule.bind(null, moduleBased));
            }
        }

        if (passedViaConstructor) {
            passedViaConstructor.forEach(addModule.bind(null, true));
        }

        if (registered) {
            registered.forEach(addModule.bind(null, !ModuleRegistry.isPackageBased()));
        }

        return allModules;
    }

    private registerModuleUserComponents(context: Context, registeredModules: Module[]): void {
        const userComponentRegistry: UserComponentRegistry = context.getBean('userComponentRegistry');

        const moduleUserComps: { componentName: string, componentClass: AgGridRegisteredComponentInput<IComponent<any>>; }[]
            = this.extractModuleEntity(registeredModules,
                (module) => module.userComponents ? module.userComponents : []);

        moduleUserComps.forEach(compMeta => {
            userComponentRegistry.registerDefaultComponent(compMeta.componentName, compMeta.componentClass);
        });
    }

    private createProvidedBeans(eGridDiv: HTMLElement, gridOptions: GridOptions, params?: GridParams): any {
        let frameworkOverrides = params ? params.frameworkOverrides : null;
        if (missing(frameworkOverrides)) {
            frameworkOverrides = new VanillaFrameworkOverrides();
        }

        const seed = {
            gridOptions: gridOptions,
            eGridDiv: eGridDiv,
            $scope: params ? params.$scope : null,
            $compile: params ? params.$compile : null,
            globalEventListener: params ? params.globalEventListener : null,
            frameworkOverrides: frameworkOverrides
        };
        if (params && params.providedBeanInstances) {
            assign(seed, params.providedBeanInstances);
        }

        return seed;
    }

    private createAgStackComponentsList(registeredModules: Module[]): any[] {
        let components: ComponentMeta[] = [
            { componentName: 'AgCheckbox', componentClass: AgCheckbox },
            { componentName: 'AgRadioButton', componentClass: AgRadioButton },
            { componentName: 'AgToggleButton', componentClass: AgToggleButton },
            { componentName: 'AgInputTextField', componentClass: AgInputTextField },
            { componentName: 'AgInputTextArea', componentClass: AgInputTextArea },
            { componentName: 'AgInputNumberField', componentClass: AgInputNumberField },
            { componentName: 'AgInputRange', componentClass: AgInputRange },
            { componentName: 'AgSelect', componentClass: AgSelect },
            { componentName: 'AgSlider', componentClass: AgSlider },
            { componentName: 'AgAngleSelect', componentClass: AgAngleSelect },
            { componentName: 'AgColorPicker', componentClass: AgColorPicker },
            { componentName: 'AgGridBody', componentClass: GridBodyComp },
            { componentName: 'AgHeaderRoot', componentClass: HeaderRootComp },
            { componentName: 'AgPagination', componentClass: PaginationComp },
            { componentName: 'AgOverlayWrapper', componentClass: OverlayWrapperComponent },
            { componentName: 'AgGroupComponent', componentClass: AgGroupComponent },
            { componentName: 'AgPanel', componentClass: AgPanel },
            { componentName: 'AgDialog', componentClass: AgDialog },
            { componentName: 'AgRowContainer', componentClass: RowContainerComp },
            { componentName: 'AgFakeHorizontalScroll', componentClass: FakeHScrollComp }
        ];

        const moduleAgStackComps = this.extractModuleEntity(registeredModules,
            (module) => module.agStackComponents ? module.agStackComponents : []);

        components = components.concat(moduleAgStackComps);

        return components;
    }

    private createBeansList(rowModelType: string | undefined, registeredModules: Module[]): any[] | undefined {
        const rowModelClass = this.getRowModelClass(rowModelType, registeredModules);

        if (!rowModelClass) { return; }

        // beans should only contain SERVICES, it should NEVER contain COMPONENTS

        const beans = [
            rowModelClass, Beans, RowPositionUtils, CellPositionUtils, HeaderPositionUtils,
            PaginationAutoPageSizeService, GridApi, UserComponentRegistry, AgComponentUtils,
            ComponentMetadataProvider, ResizeObserverService, UserComponentFactory,
            RowContainerHeightService, AutoHeightCalculator, HorizontalResizeService,
            PinnedRowModel, DragService, DisplayedGroupCreator, EventService, GridOptionsWrapper,
            PopupService, SelectionController, FilterManager, ColumnModel, HeaderNavigationService,
            PaginationProxy, RowRenderer, ExpressionService, ColumnFactory, TemplateService,
            AlignedGridsService, NavigationService, ValueCache, ValueService, LoggerFactory,
            ColumnUtils, AutoWidthCalculator, StandardMenuFactory, DragAndDropService, ColumnApi,
            FocusController, MouseEventService, Environment, CellNavigationService, ValueFormatterService,
            StylingService, ScrollVisibleService, SortController, ColumnHoverService, ColumnAnimationService,
            SelectableService, AutoGroupColService, ChangeDetectionService, AnimationFrameService,
            DetailRowCompCache, UndoRedoService, AgStackComponentsRegistry, ColumnDefFactory,
            RowCssClassCalculator, RowNodeBlockLoader, RowNodeSorter, ControllersService,
            PinnedWidthService
        ];

        const moduleBeans = this.extractModuleEntity(registeredModules, (module) => module.beans ? module.beans : []);
        beans.push(...moduleBeans);

        // check for duplicates, as different modules could include the same beans that
        // they depend on, eg ClientSideRowModel in enterprise, and ClientSideRowModel in community
        const beansNoDuplicates: any[] = [];
        beans.forEach(bean => {
            if (beansNoDuplicates.indexOf(bean) < 0) {
                beansNoDuplicates.push(bean);
            }
        });

        return beansNoDuplicates;
    }

    private extractModuleEntity(moduleEntities: any[], extractor: (module: any) => any) {
        return [].concat(...moduleEntities.map(extractor));
    }

    private setColumnsAndData(context: Context): void {
        const gridOptionsWrapper: GridOptionsWrapper = context.getBean('gridOptionsWrapper');
        const columnModel: ColumnModel = context.getBean('columnModel');
        const columnDefs = gridOptionsWrapper.getColumnDefs();

        columnModel.setColumnDefs(columnDefs || [], "gridInitializing");

        const rowModel: IRowModel = context.getBean('rowModel');
        rowModel.start();
    }

    private dispatchGridReadyEvent(context: Context, gridOptions: GridOptions): void {
        const eventService: EventService = context.getBean('eventService');
        const readyEvent: GridReadyEvent = {
            type: Events.EVENT_GRID_READY,
            api: gridOptions.api!,
            columnApi: gridOptions.columnApi!
        };
        eventService.dispatchEvent(readyEvent);
    }

    private getRowModelClass(rowModelType: string | undefined, registeredModules: Module[]): any {

        // default to client side
        if (!rowModelType) {
            rowModelType = Constants.ROW_MODEL_TYPE_CLIENT_SIDE;
        }

        const rowModelClasses: { [name: string]: { new(): IRowModel; }; } = {};
        registeredModules.forEach(module => {
            iterateObject(module.rowModels, (key: string, value: { new(): IRowModel; }) => {
                rowModelClasses[key] = value;
            });
        });

        const rowModelClass = rowModelClasses[rowModelType];

        if (exists(rowModelClass)) { return rowModelClass; }

        if (rowModelType === Constants.ROW_MODEL_TYPE_INFINITE) {
            console.error(`AG Grid: Row Model "Infinite" not found. Please ensure the ${ModuleNames.InfiniteRowModelModule} is registered.';`);
        }

        console.error('AG Grid: could not find matching row model for rowModelType ' + rowModelType);
        if (rowModelType === Constants.ROW_MODEL_TYPE_VIEWPORT) {
            console.error(`AG Grid: Row Model "Viewport" not found. Please ensure the AG Grid Enterprise Module ${ModuleNames.ViewportRowModelModule} is registered.';`);
        }

        if (rowModelType === Constants.ROW_MODEL_TYPE_SERVER_SIDE) {
            console.error(`AG Grid: Row Model "Server Side" not found. Please ensure the AG Grid Enterprise Module ${ModuleNames.ServerSideRowModelModule} is registered.';`);
        }

        if (rowModelType === Constants.ROW_MODEL_TYPE_CLIENT_SIDE) {
            console.error(`AG Grid: Row Model "Client Side" not found. Please ensure the ${ModuleNames.ClientSideRowModelModule} is registered.';`);
        }
    }

}
