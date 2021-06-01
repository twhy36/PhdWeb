import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';

@Component({
	selector: 'quantity-input',
	templateUrl: './quantity-input.component.html',
	styleUrls: ['./quantity-input.component.scss']
})
export class QuantityInputComponent implements OnInit
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
	
	@Output() quantityChange: EventEmitter<number>;
	@ViewChild('quantity') element: ElementRef;

	currentQty: number;

	constructor(private cd: ChangeDetectorRef)
	{
		this.quantityChange = new EventEmitter();
	}

	ngOnInit() { }

	enforceMinMax(value)
	{
		if (this.currentQty !== value)
		{
			if (value < this.min)
			{
				this.currentQty = this.min;
			}
			else if (value > this.max)
			{
				this.currentQty = null;
			}
			else
			{
				this.currentQty = value;
			}

			this.quantityChange.emit(this.currentQty);
			this.element.nativeElement.value = this.currentQty;
			this.cd.detectChanges();
		}
	}

}
