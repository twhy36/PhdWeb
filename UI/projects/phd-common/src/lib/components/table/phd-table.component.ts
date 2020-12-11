import { Component, ContentChildren, QueryList, Input, Output, EventEmitter, AfterContentInit, ViewChild, OnChanges, TemplateRef, ContentChild, forwardRef, SimpleChanges, AfterViewInit } from '@angular/core';
import { PhdColumnDirective } from './phd-column.directive';
import { DomHandler } from 'primeng/dom';
import { ObjectUtils, FilterUtils } from 'primeng/utils';
import { Table, TableService } from 'primeng/table';
import { Dropdown } from 'primeng/dropdown';
import { OverlayPanel } from 'primeng/overlaypanel';

@Component({
	selector: 'phd-table',
	templateUrl: './phd-table.component.html',
	styleUrls: ['./phd-table.component.scss'],
	providers: [DomHandler, ObjectUtils, Table, TableService, OverlayPanel]
})
export class PhdTableComponent implements AfterContentInit, OnChanges
{
	@ContentChildren(PhdColumnDirective, { descendants: true }) columnRefs: QueryList<PhdColumnDirective>;
	@Input("columns") inputColumns: PhdColumnDirective[];
	columns: PhdColumnDirective[];
	@Input() tableId: string
	@Input() canReorderRows: boolean = false;
	@Input() showColumnHeaders: boolean = true;
	@Input() showCaption: boolean = false;      //Used in tables that are nested in child components since basing the visibility on local variables doesn't work in them
	@ContentChild("rowGroupHeader") rowGroupHeaderTemplate: TemplateRef<any>;
	@ContentChild("rowGroupFooter") rowGroupFooterTemplate: TemplateRef<any>;
	@ContentChild("tableHeader") tableHeaderTemplate: TemplateRef<any>;
	@ContentChild("rowExpansion") rowExpansionTemplate: TemplateRef<any>;
	@Input() groupByKey?: string;
	@Input() rowFilter?: (rowData: any) => boolean;
	@Input() rowGroupHeaderMode?: string = "single";
	@Input() rowClass?: (rowData: any) => object;
	@Input() showGlobalFilter: boolean = false;
	@Input() noRecordsMessage: string = 'No records found!';

	filterSelections: { [field: string]: any[] } = {};
	globalFilterInput: string = "";
	rowGroupMetadata: any;
	tooltipText: string;

	@ViewChild(Table, { static: false }) table: Table;
	@ViewChild("tt") tooltipOverlay: OverlayPanel;

	//p-Table stuff passed through
	@Input() value: any[];
	@Input() selectionMode: string;
	@Input() selection: any;
	@Output("selectionChange") selectionEmitter = new EventEmitter<any>();
	@Output("onModelChange") onModelChangeEmitter = new EventEmitter<any>();
	@Output("onRowReorder") onRowReorderEmitter = new EventEmitter<any>();
	@Output("onRowSelect") onRowSelectEmitter = new EventEmitter<any>();
	@Output("onRowUnselect") onRowUnselectEmitter = new EventEmitter<any>();
	@Output("onFilter") onFilterEmitter = new EventEmitter<number>();

	@Input() dataKey: string;
	@Input() sortMode?: string;
	@Input() sortField?: string;
	@Input() displayTooltip: boolean = true;
	@Input() nonOverflow: boolean = true;
	@Input() loading: boolean = false;

	visibleColumns: PhdColumnDirective[] = [];
	hideableColumns: PhdColumnDirective[] = [];
	filterableColumns: PhdColumnDirective[] = [];

	get allColumns(): PhdColumnDirective[]
	{
		return this.columnRefs && this.columnRefs.length
			? this.columnRefs.toArray()
			: this.inputColumns;
	}

	ngOnChanges(): void
	{
		if (this.value)
		{
			this.value.forEach((val, i) => val["__index"] = i);
		}

		if (this.groupByKey && this.value)
		{
			this.rowGroupMetadata = {};

			this.value.forEach((val, i) =>
			{
				let metadata: { startIndex: number, count: number } = this.rowGroupMetadata[val[this.groupByKey]];

				if (!metadata)
				{
					this.rowGroupMetadata[val[this.groupByKey]] = { startIndex: i, count: 1 };
				}
				else
				{
					metadata.count++;
				}
			});
		}

		if (this.table && Object.keys(this.table.filters))
		{
			for (let key of Object.keys(this.table.filters))
			{
				this.table.filter(this.table.filters[key].value, key, this.table.filters[key].matchMode);
			}
		}
	}

	ngAfterContentInit(): void
	{
		let settingsJSON = localStorage.getItem(this.tableId);

		if (settingsJSON)
		{
			let settings = JSON.parse(settingsJSON);

			settings.cols.forEach((col: any) =>
			{
				let colRef = this.columnRefs.find(c => c.columnId === col.columnId);
				if (colRef)
				{
					colRef.colSize = col.colSize;

					if (colRef.colSize)
					{
						colRef.width = `${colRef.colSize}px`;
					}

					colRef.isHidden = col.isHidden;
				}
			});
		}

		this.columns = this.allColumns.filter(c => !c.isHidden && !c.hidden);
		this.hideableColumns = this.allColumns.filter(c => c.canHide);
		this.visibleColumns = this.allColumns.filter(c => c.canHide && !c.isHidden);
		this.filterableColumns = this.allColumns.filter(c => c.canFilter);

		this.filterableColumns.forEach(col =>
		{
			if (col.filterDefault)
			{
				this.filterSelections[col.field] = col.filterDefault;

				if (col.filterMode === 'single')
				{
					this.filterTableSingle(col.filterDefault, col);
				}
				else
				{
					this.filterTableMulti(col.filterDefault, col);
				}
			}
			else
			{
				this.filterSelections[col.field] = this.getFilterOptions(col.field);

				switch (col.filterMode)
				{
					case 'single':
						this.filterSelections[col.field] = [];
						break;
					case 'multiple':
						this.filterSelections[col.field] = [];
						break;
					default:
						break;
				}
			}
		});

		if (this.table && this.selectionMode)
		{
			this.table.selectionMode = this.selectionMode;
			this.table.selection = this.selection;
		}

		//don't allow sorting if row grouping is enabled
		if (this.groupByKey)
		{
			this.sortMode = null;
		}

		if (this.table)
		{
			this.table.selectRange = this.selectRange;
		}
	}

	ngAfterViewInit()
	{		
		FilterUtils['any'] = function (value: any[], filter: any[]): boolean
		{
			if (!value)
			{
				return false;
			}

			if (!filter || !filter.length)
			{
				return true;
			}

			return filter.some(v => value.indexOf(v) !== -1);
		}	
	}

	updateVisibleColumns(visibleColumns: PhdColumnDirective[]): void
	{
		this.hideableColumns.forEach(col =>
		{
			col.isHidden = !visibleColumns.find(c => c.columnId === col.columnId);
		});
		this.columns = this.allColumns.filter(c => !c.isHidden && !c.hidden);

		this.saveSettings();
	}

	resizeColumn(event: any): void
	{
		var col = this.allColumns.find(c => c.columnId === event.element.attributes["data-columnid"].value);
		col.colSize = event.element.clientWidth;

		this.saveSettings();
	}

	private saveSettings(): void
	{
		let settings = {
			cols: this.allColumns.map(col => { return { columnId: col.columnId, colSize: col.colSize, isHidden: col.canHide ? col.isHidden : false }; })
		};

		localStorage.setItem(this.tableId, JSON.stringify(settings));
	}

	onBlurDeselect(blurEvent: FocusEvent): void
	{
		//Force an ESC keypress so that the PrimeNg table leaves Edit Mode.
		const key = { 'key': '27', 'keyCode': '27' }
		const enterEvent = new KeyboardEvent('keydown', key);

		blurEvent['path'].forEach((obj: Element) =>
		{
			if ('SPAN' === obj.tagName)
			{
				obj.dispatchEvent(enterEvent);
			}
		});
	}

	onModelChange(event: any, rowData: any): void
	{
		this.onModelChangeEmitter.emit(rowData);
	}

	onRowReorder(event: any): void
	{
		this.onRowReorderEmitter.emit(event);
	}

	onRowSelect(event: any): void
	{
		this.onRowSelectEmitter.emit(event);
	}

	onRowUnselect(event: any): void
	{
		this.onRowUnselectEmitter.emit(event);
	}

	selectionChange(selection: any): void
	{
		this.selectionEmitter.emit(selection);
	}

	getFilterOptions(fieldName: string): any[]
	{
		return Array.from(new Set(this.value.map(v => v[fieldName])));
	}

	filterTableMulti(event: any, col: PhdColumnDirective): void
	{
		if (event === null)
		{
			this.table.filter('', col.field, "in");
			return;
		}

		if (col.filterMatchMode == 'contains')
		{
			this.table.filter((event).toString(), col.field, "contains");
			return;
		}

		if (col.filterDataType == 'boolean')
		{
			if (event == 0 || event[0] == 0)
			{
				event = false;
			}
			if (event == 1 || event[0] == 1)
			{
				event = true;
			}
		}

		this.table.filter(event, col.field, col.filterMatchMode);
	}

	filterTableSingle(event: any, col: PhdColumnDirective): void
	{
		if (event === null)
		{
			this.table.filter('', col.field, col.filterMatchMode);
			return;
		}

		if (col.filterMatchMode == 'contains')
		{
			this.table.filter((event).toString(), col.field, col.filterMatchMode);
			return;
		}

		if (col.filterDataType == 'boolean')
		{
			if (event == 0 || event[0] == 0)
			{
				event = false;
			}
			if (event == 1 || event[0] == 1)
			{
				event = true;
			}
		}

		if (!Array.isArray(event))
		{
			event = [event];
		}

		this.table.filter(event, col.field, col.filterMatchMode);
	}

	onFilter(event: any): void
	{
		this.onFilterEmitter.emit(event.filteredValue.length);

		if (this.groupByKey)
		{
			let values: any[] = event.filteredValue;
			this.rowGroupMetadata = {};

			values.forEach((val, i) =>
			{
				let metadata: { startIndex: number, count: number } = this.rowGroupMetadata[val[this.groupByKey]];

				if (!metadata)
				{
					this.rowGroupMetadata[val[this.groupByKey]] = { startIndex: i, count: 1 };
				} else
				{
					metadata.count++;
				}
			});
		}
	}

	toggleRow(data: any, event: Event): void
	{
		this.table.toggleRow(data, event);
		event.preventDefault();
	}

	collapseAllExpandedRows()
	{
		this.table.expandedRowKeys = {};
	}

	//Overrides default PrimeNG table selectRange method in order to fix shift click selection while filtering
	selectRange = function (event: any, rowIndex: number): void
	{
		var rangeStart;
		var rangeEnd;

		let selectMultipleRows = (rangeStart: number, rangeEnd: number): void =>
		{
			for (var i = rangeStart; i <= rangeEnd; i++)
			{
				var rangeRowData = this.filteredValue[i];
				if (!this.isSelected(rangeRowData))
				{
					this._selection = this.selection.concat([rangeRowData]);
					var dataKeyValue = this.dataKey ? String(this.objectUtils.resolveFieldData(rangeRowData, this.dataKey)) : null;
					if (dataKeyValue)
					{
						this.selectionKeys[dataKeyValue] = 1;
					}
					this.selectionChange.emit(this.selection);
					this.onRowSelect.emit({ originalEvent: event, data: rangeRowData, type: 'row' });
				}
			}
		}

		if (this.anchorRowIndex > rowIndex)
		{
			rangeStart = rowIndex;
			rangeEnd = this.anchorRowIndex;
		}
		else if (this.anchorRowIndex < rowIndex)
		{
			rangeStart = this.anchorRowIndex;
			rangeEnd = rowIndex;
		}
		else
		{
			rangeStart = rowIndex;
			rangeEnd = rowIndex;
		}

		//Check for row data in the filtered data set first
		if (this.filteredValue)
		{
			selectMultipleRows(rangeStart, rangeEnd)
		} else
		{
			//Check for row data in complete data set if no filters have been applied
			selectMultipleRows(rangeStart, rangeEnd)
		}
	}

	showTooltip(event: any, tooltipText: string): void
	{
		if (this.displayTooltip)
		{
			this.tooltipText = tooltipText;
			this.tooltipOverlay.appendTo = event.target.parentElement;
			this.tooltipOverlay.show(event, event.target);
		}
	}

	hideTooltip(): void
	{
		this.tooltipText = '';
		this.tooltipOverlay.hide();
	}

	getDefaultRowClass(rowIndex: number): string
	{
		return rowIndex % 2 == 0 ? null : 'phd-alternate-row';
	}
}
