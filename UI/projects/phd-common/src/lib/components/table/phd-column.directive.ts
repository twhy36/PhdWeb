import { Directive, Input, ContentChild, TemplateRef, OnChanges } from '@angular/core';

@Directive({
	selector: 'phd-column'
})
export class PhdColumnDirective implements OnChanges
{
	@Input() columnId?: string;
	@Input() header: string;                    //Text to be displayed in Column Header
	@Input() field: string;                     //Name of the field in the dataset to get the data from 
	@Input() styleClass: string;
	@Input() columnClass: string;
	@Input() headerStyleClass: string = 'text-left';
	@Input() width: string;
	@Input() hidden: boolean = false;

	@Input() canEdit: boolean = false;          //Specifies if data within Column can be edited

	@Input() canHide: boolean = false;           //Specifies if Column visibility can be changed via Column Toggler

	@Input() canFilter: boolean = false;        //Specifies if records can be filtered by data within Column
	@Input() filterDataType: string = 'string';      //Specifies the data type of the filter (needed for boolean data to patch primeng issue - ex. IsActive)
	@Input() filterMode: string = 'multiple';   //Specifies the "mode" that you can filter (single/multiple/text search)
	@Input() filterMatchMode: string = 'in';         //Specifies the "match mode" for the filter. i.e. "in" or "contains" 
	@Input() filterRequired: boolean = false;   //Specifies whether at least one option in the filter must be selected at all times
	@Input() filterDefault?: any[];             //Specifies the which filterOptions to pre-filter the data on
	@Input() filterLabel?: string;              //Specifies the text displayed on the filter control
	@Input() filterOptions: any[];              //Specifies the data items that records can be filitered on        
	@Input() filterVisible: boolean = true;     //Controls the visibility of the filtering control
	@Input() filterPlaceholder: string;         //Default text to display when no option is selected
	@Input() displaySelectedLabel: boolean = false;  //Controls visibility of selected items label in multiselect dropdown
	@Input() maxSelectedLabels?: number;             //Specifies max number of labels to show in multiselect dropdown
	@Input() showFilterHeader: boolean = false;      //Controls the visibility of the filter header in the multiselect dropdown

	@Input() canSort: boolean = true;           //Specifies if records can be sorted by data within Column            
	@Input() isDragHandler: boolean = false;      //Specifies if the item is drag handler when reordering rows

	@ContentChild('body') bodyTemplate: TemplateRef<any>;
	@ContentChild('header') headerTemplate: TemplateRef<any>;

	isHidden: boolean = false;
	colSize: number;

	ngOnChanges(): void
	{
		this.columnId = this.columnId || this.field || this.header;

		if (!this.field)
		{
			this.canSort = false;
		}
	}
}
