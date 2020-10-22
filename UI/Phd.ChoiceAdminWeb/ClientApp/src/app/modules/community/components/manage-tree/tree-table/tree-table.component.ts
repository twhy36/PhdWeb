import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';

import { DTree, IDTVersion, DTChoice, DTPoint, DTSubGroup, IDTPoint, IDTSubGroup } from '../../../../shared/models/tree.model';
import { TreeService } from '../../../../core/services/tree.service';
import { UiUtilsService } from '../../../../core/services/ui-utils.service';
import { TreeToggleComponent } from '../../../../shared/components/tree-toggle/tree-toggle.component';

@Component({
	selector: 'tree-table',
	templateUrl: './tree-table.component.html',
	styleUrls: ['./tree-table.component.scss']
})
export class TreeTableComponent implements OnInit
{
	constructor(
		public treeService: TreeService,
		private _uiUtilsService: UiUtilsService
	) { }

	@Input() lockedFromChanges = false;
	@Input() isReadOnly = false;
	@Input() tree: Observable<DTree>;
	@Input() dragEnable = false;
	@Input() treeToggle: TreeToggleComponent;
	@Input() openGroups: boolean;
	@Input() openSubGroups: boolean;
	@Input() openPoints: boolean;

	@Output() pointSelected = new EventEmitter<{ item: DTPoint, tab: string }>();
	@Output() choiceSelected = new EventEmitter<{ item: DTChoice, tab: string }>();
	@Output() deletePoint = new EventEmitter<DTPoint>();
	@Output() deleteChoice = new EventEmitter<DTChoice>();
	@Output() addItem = new EventEmitter<DTPoint | DTSubGroup>();
	@Output() dragHasChanged = new EventEmitter();
	@Output() toggleInteractiveFloor = new EventEmitter();

	treeVersion: IDTVersion;

	draggedItem: DTPoint | DTChoice;

	ngOnInit(): void
	{
		this.tree.subscribe(t =>
		{
			this.treeVersion = t ? t.version : null;
		});
	}

	scrollToPoint(value: IDTPoint)
	{
		if (value)
		{
			// scroll to point
			this._uiUtilsService.scrollToId(`point_${value.id}`);
		}
	}

	onChoiceSelect(event: any, item: DTChoice)
	{
		this.choiceSelected.emit({ item: item, tab: 'details' });
	}

	onPointSelect(event: any, item: DTPoint)
	{
		this.pointSelected.emit({ item: item, tab: 'details' });
	}

	onShowPointDetailsClick(item: DTPoint, tab: string)
	{
		this.pointSelected.emit({ item: item, tab: tab });
	}

	onShowChoiceDetailsClick(item: DTChoice, tab: string)
	{
		this.choiceSelected.emit({ item: item, tab: tab });
	}

	deleteChoiceClick(choice: DTChoice)
	{
		this.deleteChoice.emit(choice);
	}

	deletePointClick(point: DTPoint)
	{
		this.deletePoint.emit(point);
	}

	addPointsClick(subgroup: DTSubGroup)
	{
		this.addItem.emit(subgroup);
	}

	addChoicesClick(point: DTPoint)
	{
		this.addItem.emit(point);
	}

	canAddFromDivCatalog(hasUnusedItems: boolean)
	{
		let canAdd = !this.isReadOnly;

		if (canAdd)
		{
			canAdd = hasUnusedItems;
		}

		return canAdd;
	}

	toggleInteractiveFloorplan(subGroup: IDTSubGroup)
	{
		if (!this.isReadOnly)
		{
			subGroup.useInteractiveFloorplan = !subGroup.useInteractiveFloorplan;

			this.toggleInteractiveFloor.emit(subGroup);
		}
	}

	handleDrop(event: any, item: DTPoint | DTChoice)
	{
		if (event)
		{
			if (item instanceof DTPoint)
			{
				const divPointCatalogId = (this.draggedItem as DTPoint).divPointCatalogId;

				if (this.canDrop(divPointCatalogId, item) && item.divPointCatalogId !== divPointCatalogId)
				{
					this.dragHasChanged.emit();

					const parent = item.parent;

					const oldIndex = parent.points.findIndex(x => x.divPointCatalogId === divPointCatalogId);
					const newIndex = parent.points.findIndex(x => x.divPointCatalogId === item.divPointCatalogId);

					this.reSort(parent.points, oldIndex, newIndex);
				}
			}
			else if (item instanceof DTChoice)
			{
				const divChoiceCatalogId = (this.draggedItem as DTChoice).divChoiceCatalogId;

				if (this.canDrop(divChoiceCatalogId, item) && item.divChoiceCatalogId !== divChoiceCatalogId)
				{
					this.dragHasChanged.emit();

					const parent = item.parent;

					const oldIndex = parent.choices.findIndex(x => x.divChoiceCatalogId === divChoiceCatalogId);
					const newIndex = parent.choices.findIndex(x => x.divChoiceCatalogId === item.divChoiceCatalogId);

					this.reSort(parent.choices, oldIndex, newIndex);
				}
			}
		}
	}

	handleDragStart(event: any, item: DTPoint | DTChoice)
	{
		if (event)
		{
			this.draggedItem = item;
		}
	}

	handleDragEnter(event: any, item: DTPoint | DTChoice)
	{
		if (event)
		{
			let dragId = 0;

			if (item instanceof DTPoint)
			{
				dragId = (this.draggedItem as DTPoint).divPointCatalogId;
			}
			else if (item instanceof DTChoice)
			{
				dragId = (this.draggedItem as DTChoice).divChoiceCatalogId;
			}

			if (!this.canDrop(dragId, item))
			{
				event[0].nativeElement.classList.remove('over');
			}
		}
	}

	getDragItem(item: DTPoint | DTChoice)
	{
		let id = 0;

		if (item instanceof DTPoint)
		{
			id = item.divPointCatalogId;
		}
		else if (item instanceof DTChoice)
		{
			id = item.divChoiceCatalogId;
		}

		return id;
	}

	private canDrop(dragId: number, item: DTPoint | DTChoice)
	{
		let canDrop = false;

		if (item instanceof DTPoint)
		{
			canDrop = item.parent.points.findIndex(x => x.divPointCatalogId === dragId) !== -1;
		}
		else if (item instanceof DTChoice)
		{
			canDrop = item.parent.choices.findIndex(x => x.divChoiceCatalogId === dragId) !== -1;
		}

		return canDrop;
	}

	private reSort(itemList: any, oldIndex: number, newIndex: number, sortName?: string)
	{
		sortName = sortName != null ? sortName : 'sortOrder';

		if (newIndex >= itemList.length)
		{
			let k = newIndex - itemList.length;

			while ((k--) + 1)
			{
				itemList.push(undefined);
			}
		}

		// reorder items in array
		itemList.splice(newIndex, 0, itemList.splice(oldIndex, 1)[0]);

		let counter = 1;

		itemList.forEach(item =>
		{
			// update sortOrder
			item[sortName] = counter++;
			item.sortChanged = true;
		});

		// resort using new sortOrders
		itemList.sort((left: any, right: any) =>
		{
			return left[sortName] === right[sortName] ? 0 : (left[sortName] < right[sortName] ? -1 : 1);
		});
	}
}
