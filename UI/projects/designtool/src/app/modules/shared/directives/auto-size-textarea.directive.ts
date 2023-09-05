import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
	selector: '[autoSizeTextarea]'
})
export class AutoResizeTextareaDirective {
	constructor(private el: ElementRef) {}

	@HostListener('input', ['$event.target'])

	onInput(textarea: HTMLTextAreaElement): void
	{
		this.adjustTextareaSize(textarea);
	}

	ngAfterViewInit()
	{
		this.adjustTextareaSize(this.el.nativeElement);
	}

	private adjustTextareaSize(textarea: HTMLTextAreaElement): void
	{
		textarea.style.overflow = 'hidden';
		textarea.style.height = 'auto';
		textarea.style.resize = 'none';
		textarea.style.height = textarea.scrollHeight + 'px';
	}
}
