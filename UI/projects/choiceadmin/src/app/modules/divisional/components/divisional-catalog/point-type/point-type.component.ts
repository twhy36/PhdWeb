import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms';

import { DivDPoint, IDPointPickType, ConstructionStageTypes } from '../../../../shared/models/point.model';
import { DivDSubGroup } from '../../../../shared/models/subgroup.model';

import { DivisionalService } from '../../../../core/services/divisional.service';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
	selector: 'point-type',
	templateUrl: './point-type.component.html',
	styleUrls: ['./point-type.component.scss']
})
export class PointTypeComponent implements OnInit
{
	@Input() catalogItem: DivDPoint;

	@Output() onSaveCatalogItem = new EventEmitter<{ item: DivDPoint }>();

	catalogForm: FormGroup;

	pickTypes: Array<IDPointPickType> = [];

	selectedCutOffType;
	stageTypeEnum = ConstructionStageTypes;

	get stageTypes(): Array<string>
	{
		return Object.keys(this.stageTypeEnum).filter(type => isNaN(<any>type));
	}

	get isDirty(): boolean
	{
		return this.catalogForm.dirty;
	}

	constructor(private _divService: DivisionalService) { }

	ngOnInit()
	{
		this.createForm();
	}

	createForm()
	{
		let item = this.catalogItem;

		this._divService.getPointPickTypes().subscribe(pickTypes =>
		{
			this.pickTypes = pickTypes.filter(pt => !(<DivDSubGroup>item.parent).isFloorplanSubgroup || pt.dPointPickTypeID < 5);
		});

		let label: string = item.dto.dPointLabel;
		let description: string = item.dto.dPointDescription;
		let pointPickType: number = item.dto.dPointPickTypeID == 0 ? null : item.dto.dPointPickTypeID;
		let isQuickQuote: boolean = item.isQuickQuote;
		let isStructural: boolean = item.isStructural;
		let isHiddenFromBuyerView: boolean = item.isHiddenFromBuyerView;
		let stage: number = item.edhConstructionStageId;
		let days: number = item.cutOffDays;

		if (stage != null || days != null)
		{
			this.selectedCutOffType = stage != null ? 0 : 1;
		}

		this.catalogForm = new FormGroup({
			'pointPickType': new FormControl(pointPickType, Validators.required),
			'isQuickQuote': new FormControl(isQuickQuote),
			'isStructural': new FormControl(isStructural),
			'isHiddenFromBuyerView': new FormControl(isHiddenFromBuyerView),
			'cutOffStage': new FormControl({ value: stage, disabled: this.selectedCutOffType !== 0 }),
			'cutOffDays': new FormControl({ value: days, disabled: this.selectedCutOffType !== 1 }, [Validators.min(-9999), Validators.max(9999), this.numberValidator()]),
			'cutOffType': new FormControl({ value: this.selectedCutOffType })
		});

		if (item.isFlooring)
		{
			this.catalogForm.addControl('itemLabel', new FormControl(label, Validators.required, this.labelValidator.bind(this)));
			this.catalogForm.addControl('itemDescription', new FormControl(description));
		}
	}

	labelValidator(control: AbstractControl): Promise<{ [key: string]: any; }> | Observable<{ [key: string]: any; }>
	{
		const label = control.value;
		const point = this.catalogItem;

		if (label.length > 0 && label !== point.label)
		{
			let obs = this._divService.doesPointLabelExist(label, point.id, point.dto.dPointCatalogID, point.dto.orgID).pipe(map((data) =>
			{
				return data ? { 'alreadyExist': true } : null;
			}));

			return obs;
		}

		return of(null);
	}

	numberValidator(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: any } =>
		{
			const val: string = control.value;

			// allow only positive or negative numbers.  
			const exp = new RegExp(/^([-]?[0-9])*[-]?[0-9]+$/);
			let isValid = val ? exp.test(val) : true;

			if (val != null)
			{
				// make sure value is not 0
				isValid = +val > 0 || +val < 0;
			}

			return isValid ? null : { numberValidator: true }
		};
	}

	onCutOffTypeChange(cutOffType)
	{
		const stage = this.catalogForm.controls['cutOffStage'];
		const days = this.catalogForm.controls['cutOffDays'];

		if (cutOffType === 0)
		{
			this.resetField(stage, true);
			this.resetField(days);
		}
		else
		{
			this.resetField(stage);
			this.resetField(days, true);
		}
	}

	resetField(field: AbstractControl, enabled: boolean = false)
	{
		field.setValue(undefined);
		enabled ? field.enable() : field.disable();
	}

	save(): DivDPoint
	{
		const item = this.catalogItem;
		const form = this.catalogForm;

		let pointPickType = form.get('pointPickType').value;
		let isQuickQuote = form.get('isQuickQuote').value;
		let isStructural = form.get('isStructural').value;
		let isHiddenFromBuyerView = form.get('isHiddenFromBuyerView').value;
		let edhConstructionStageId = form.get('cutOffStage').value || null;
		let cutOffDays = form.get('cutOffDays').value || null;

		let pickType = this.pickTypes.find(x => x.dPointPickTypeID == pointPickType);

		if (item.isFlooring)
		{
			item.dto.dPointLabel = form.get('itemLabel').value;;
			item.dto.dPointDescription = form.get('itemDescription').value;
		}

		item.dto.dPointPickType = pickType;
		item.dto.dPointPickTypeID = pickType.dPointPickTypeID;
		item.isQuickQuote = isQuickQuote;
		item.isStructural = isStructural;
		item.isHiddenFromBuyerView = isHiddenFromBuyerView;
		item.edhConstructionStageId = edhConstructionStageId;
		item.cutOffDays = cutOffDays;

		return item;
	}

	resetForm()
	{
		const stage = this.catalogForm.controls['cutOffStage'];
		const days = this.catalogForm.controls['cutOffDays'];

		this.resetField(stage);
		this.resetField(days);

		this.catalogForm.reset();
	}
}
