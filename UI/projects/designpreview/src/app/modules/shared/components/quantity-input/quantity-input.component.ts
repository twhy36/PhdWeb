import { Component, Input, Output, EventEmitter, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';

@Component({
	selector: 'quantity-input',
	templateUrl: './quantity-input.component.html',
	styleUrls: ['./quantity-input.component.scss']
})
export class QuantityInputComponent
{
	@Input() max?: number;
	@Input() min?: number;
	@Input()
	set quantity(value: number)
	{
		this.currentQty = value;
		this.cd.detectChanges();
	}
	@Input() canEdit: boolean;
	@Input() isBlocked: boolean;

	@Output() quantityChange: EventEmitter<number>;
	@ViewChild('quantity') element: ElementRef;

	currentQty: number;
	timeout: null | ReturnType<typeof setTimeout> = null

	constructor(private cd: ChangeDetectorRef)
	{
		this.quantityChange = new EventEmitter();
	}

	enforceMinMax(value)
	{
		// add 1 second delay before processing QTY input		
		clearTimeout(this.timeout);
		this.timeout = setTimeout(() =>
		{
			if (this.currentQty !== value)
			{
				//reset currentQty when input is out of range, otherwise set to input value
				this.currentQty = (Number(value) && value >= this.min && value <= this.max) || value === 0 ? value : this.currentQty;

				//set valid input, only alert user when input exceed max allowed
				this.quantityChange.emit(value > this.max ? null : this.currentQty);

				this.element.nativeElement.value = this.currentQty;
				this.cd.detectChanges();
			}
		}, 1000);
	}
}
