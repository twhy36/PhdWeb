import {
	Component,
	OnInit,
	Input,
	Output,
	EventEmitter,
	ViewChild,
	ElementRef,
} from '@angular/core';
import {
	FormGroup,
	FormArray,
	FormControl,
	Validators,
	AbstractControl,
} from '@angular/forms';

import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';
import { IColorDto } from '../../models/color.model';

@Component({
	selector: 'add-color-side-panel',
	templateUrl: './add-color-side-panel.component.html',
	styleUrls: ['./add-color-side-panel.component.scss'],
})
export class AddColorSidePanelComponent implements OnInit {
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Input() sidePanelOpen: boolean = false;
	@Input() isSaving: boolean;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	colors: IColorDto[] = [];
	sidePanelHeader: string = 'Add Color';
	sidePanelSubheader: string = '';

	get disableIsDefault(): boolean {
		return true;
	}

	get disableHideChoice(): boolean {
		return true;
	}

	get disableHideChoicePrice(): boolean {
		return true;
	}

	get canSave(): boolean {
		return true;
	}

	constructor() {}

	ngOnInit() {
		this.createForm();

		for(let i=0; i < 50; i++) {
			this.colors[i] = {
				name: '',
				colorId: 0,
				sku: '',
				optionSubCategoryName: '',
				optionCategoryName: '',
				isActive: true
			};
		}
	}

	getSidePanelSubheader(): string {
		return 'Subheader title goes right here';
	}

	createForm() {}

	onAddChoice(tabIndex?: number) {}

	/**
	 * Validate label checking for duplicates
	 * @param control
	 */
	labelValidator(
		control: AbstractControl
	): Promise<{ [key: string]: any }> | Observable<{ [key: string]: any }> {
		return of(null);
	}

	save() {}

	onCloseSidePanel() {
		this.sidePanelOpen = false;
		this.onSidePanelClose.emit(this.sidePanelOpen);
	}
}
