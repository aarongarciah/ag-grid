import {
    _,
    AgGroupComponent,
    Autowired,
    Column,
    ColumnModel,
    Component,
    Events,
    FilterOpenedEvent,
    OriginalColumnGroup,
    IProvidedColumn,
    PostConstruct,
    ITooltipParams,
    PreConstruct,
    RefSelector,
    AgGroupComponentParams
} from "@ag-grid-community/core";
import { ToolPanelFilterComp } from "./toolPanelFilterComp";

export type ToolPanelFilterItem = ToolPanelFilterGroupComp | ToolPanelFilterComp;

export class ToolPanelFilterGroupComp extends Component {
    private static TEMPLATE = /* html */
        `<div class="ag-filter-toolpanel-group-wrapper">
            <ag-group-component ref="filterGroupComp"></ag-group-component>
        </div>`;

    @RefSelector('filterGroupComp') private filterGroupComp: AgGroupComponent;

    @Autowired('columnModel') private columnModel: ColumnModel;

    private readonly depth: number;
    private readonly columnGroup: IProvidedColumn;
    private readonly showingColumn: boolean;
    private childFilterComps: ToolPanelFilterItem[];
    private expandedCallback: () => void;
    private filterGroupName: string | null;

    constructor(columnGroup: IProvidedColumn, childFilterComps: ToolPanelFilterItem[],
        expandedCallback: () => void, depth: number, showingColumn: boolean) {
        super();
        this.columnGroup = columnGroup;
        this.childFilterComps = childFilterComps;
        this.depth = depth;
        this.expandedCallback = expandedCallback;
        this.showingColumn = showingColumn;
    }

    @PreConstruct
    private preConstruct(): void {
        const groupParams: AgGroupComponentParams = {
            cssIdentifier: 'filter-toolpanel',
            direction: 'vertical'
        };
        this.setTemplate(ToolPanelFilterGroupComp.TEMPLATE, { filterGroupComp: groupParams });
    }

    @PostConstruct
    public init(): void {
        this.setGroupTitle();
        this.filterGroupComp.setAlignItems('stretch');

        _.addCssClass(this.filterGroupComp.getGui(), `ag-filter-toolpanel-group-level-${this.depth}`);
        this.filterGroupComp.addCssClassToTitleBar(`ag-filter-toolpanel-group-level-${this.depth}-header`);

        this.childFilterComps.forEach(filterComp => {
            this.filterGroupComp.addItem(filterComp as Component);
            filterComp.addCssClassToTitleBar(`ag-filter-toolpanel-group-level-${this.depth + 1}-header`);
        });

        this.addExpandCollapseListeners();
        this.addFilterChangedListeners();
        this.setupTooltip();
    }

    private setupTooltip(): void {
        // we don't show tooltips for groups, as when the group expands, it's div contains the columns which also
        // have tooltips, so the tooltips would clash. Eg mouse over group, tooltip shows, mouse over column, another
        // tooltip shows but cos we didn't leave the group the group tooltip remains. this should be fixed in the future,
        // maybe the group shouldn't contain the children form a DOM perspective.
        if (!this.showingColumn) { return; }

        const refresh = () => {
            const newTooltipText = (this.columnGroup as Column).getColDef().headerTooltip;
            this.setTooltip(newTooltipText);
        };

        refresh();

        this.addManagedListener(this.eventService, Events.EVENT_NEW_COLUMNS_LOADED, refresh);
    }

    public getTooltipParams(): ITooltipParams {
        const res = super.getTooltipParams();
        res.location = 'filterToolPanelColumnGroup';
        return res;
    }

    public addCssClassToTitleBar(cssClass: string) {
        this.filterGroupComp.addCssClassToTitleBar(cssClass);
    }

    public refreshFilters() {
        this.childFilterComps.forEach(filterComp => {
            if (filterComp instanceof ToolPanelFilterGroupComp) {
                filterComp.refreshFilters();
            } else {
                filterComp.refreshFilter();
            }
        });
    }

    public isColumnGroup(): boolean {
        return this.columnGroup instanceof OriginalColumnGroup;
    }

    public isExpanded(): boolean {
        return this.filterGroupComp.isExpanded();
    }

    public getChildren(): ToolPanelFilterItem[] {
        return this.childFilterComps;
    }

    public getFilterGroupName(): string {
        return this.filterGroupName ? this.filterGroupName : '';
    }

    public getFilterGroupId(): string {
        return this.columnGroup.getId();
    }

    public hideGroupItem(hide: boolean, index: number) {
        this.filterGroupComp.hideItem(hide, index);
    }

    public hideGroup(hide: boolean) {
        _.addOrRemoveCssClass(this.getGui(), 'ag-hidden', hide);
    }

    private forEachToolPanelFilterChild(action: (filterComp: ToolPanelFilterItem) => void) {
        _.forEach(this.childFilterComps, filterComp => {
            if (filterComp instanceof ToolPanelFilterComp) {
                action(filterComp);
            }
        });
    }

    private addExpandCollapseListeners() {
        const expandListener = this.isColumnGroup() ?
            () => this.expandedCallback() :
            () => this.forEachToolPanelFilterChild(filterComp => filterComp.expand());

        const collapseListener = this.isColumnGroup() ?
            () => this.expandedCallback() :
            () => this.forEachToolPanelFilterChild(filterComp => filterComp.collapse());

        this.addManagedListener(this.filterGroupComp, AgGroupComponent.EVENT_EXPANDED, expandListener);
        this.addManagedListener(this.filterGroupComp, AgGroupComponent.EVENT_COLLAPSED, collapseListener);
    }

    private addFilterChangedListeners() {
        if (this.columnGroup instanceof OriginalColumnGroup) {
            const group = this.columnGroup;
            const anyChildFiltersActive = () => group.getLeafColumns().some(col => col.isFilterActive());

            group.getLeafColumns().forEach(column => {
                this.addManagedListener(column, Column.EVENT_FILTER_CHANGED, () => {
                    _.addOrRemoveCssClass(this.filterGroupComp.getGui(), 'ag-has-filter', anyChildFiltersActive());
                });
            });
        } else {
            const column = this.columnGroup as Column;

            this.addManagedListener(this.eventService, Events.EVENT_FILTER_OPENED, this.onFilterOpened.bind(this));

            this.addManagedListener(column, Column.EVENT_FILTER_CHANGED, () => {
                _.addOrRemoveCssClass(this.filterGroupComp.getGui(), 'ag-has-filter', column.isFilterActive());
            });
        }
    }

    private onFilterOpened(event: FilterOpenedEvent): void {
        // when a filter is opened elsewhere, i.e. column menu we close the filter comp so we also need to collapse
        // the column group. This approach means we don't need to try and sync filter models on the same column.

        if (event.source !== 'COLUMN_MENU') { return; }
        if (event.column !== this.columnGroup) { return; }
        if (!this.isExpanded()) { return; }

        this.collapse();
    }

    public expand() {
        this.filterGroupComp.toggleGroupExpand(true);
    }

    public collapse() {
        this.filterGroupComp.toggleGroupExpand(false);
    }

    private setGroupTitle() {
        this.filterGroupName = (this.columnGroup instanceof OriginalColumnGroup) ?
            this.getColumnGroupName(this.columnGroup) : this.getColumnName(this.columnGroup as Column);

        this.filterGroupComp.setTitle(this.filterGroupName || '');
    }

    private getColumnGroupName(columnGroup: OriginalColumnGroup): string | null {
        return this.columnModel.getDisplayNameForOriginalColumnGroup(null, columnGroup, 'filterToolPanel');
    }

    private getColumnName(column: Column): string | null {
        return this.columnModel.getDisplayNameForColumn(column, 'filterToolPanel', false);
    }

    private destroyFilters() {
        this.childFilterComps = this.destroyBeans(this.childFilterComps);
        _.clearElement(this.getGui());
    }

    protected destroy() {
        this.destroyFilters();
        super.destroy();
    }
}
