import { Directive, ElementRef, HostListener, Input } from "@angular/core";

@Directive({
	selector: '[inputFilter]'
})
export class InputFilterDirective {

	@Input() inputFilter: string;

	private specialKeys: Array<string> = ['Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Delete', 'Del', 'Escape', 'Enter'];

	private specialKeyCodes: Array<number> = [65, 67, 86, 88];

	constructor(private formElement: ElementRef) {

	}

	@HostListener('keydown', ['$event'])
	onKeyDown(e: KeyboardEvent) {

		if (this.specialKeys.indexOf(e.key) !== -1)
		{
			return;
		}

		let current: string = this.formElement.nativeElement.value;
		const position = this.formElement.nativeElement.selectionStart;
		const next: string = [current.slice(0, position), e.key == 'Decimal' ? '.' : e.key, current.slice(position)].join('');

		if (next && !String(next).match(new RegExp(this.inputFilter))) {
			e.preventDefault();
		}
	}
}
