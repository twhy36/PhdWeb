import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';

@Component({
	selector: 'price-input',
	templateUrl: './price-input.component.html',
	styleUrls: ['./price-input.component.scss']
})
export class PriceInputComponent implements OnInit
{
	editToggle: boolean = false;

	@Input() defaultValue: number;
	@Input() min: number = 0;
	@Input() max: number = 99999999;
	@Input() showAsNegative: boolean = false;

	@Output() valueChanged: EventEmitter<number>;

	@ViewChild('numberField') inputEl: ElementRef;

	currentValue: number;
	isNumber: boolean = false;

	constructor(private cd: ChangeDetectorRef)
	{
		this.valueChanged = new EventEmitter();
	}

	ngOnInit()
	{
		this.currentValue = this.defaultValue;
	}

	editValue()
	{
		this.editToggle = !this.editToggle;

		if (this.editToggle)
		{
			setTimeout(() =>
			{
				this.inputEl.nativeElement.focus();
				this.inputEl.nativeElement.select();
			});
		}
	}

	onValueChanged(value: number)
	{
		value = Math.round(value);

		if (value < this.min)
		{
			this.currentValue = this.min;
		}
		else if (value > this.max)
		{
			let newValue = value.toString();
			let maxLength = this.max.toString().length;

			this.currentValue =  +newValue.substring(0, maxLength);
		}
		else
		{
			this.currentValue = value;
		}

		// update the value, else we will not see the changes
		this.inputEl.nativeElement.value = this.currentValue;
	}

	onBlur()
	{
		if (this.currentValue != null && this.currentValue >= this.min)
		{
			this.valueChanged.emit(this.currentValue);
			this.editValue();
			this.cd.detectChanges();
		}
	}
}
