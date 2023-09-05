import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
	selector: '[autoResizeInput]'
})
export class AutoResizeInputDirective {
	constructor(private el: ElementRef, private renderer: Renderer2) {}

	@HostListener('input', ['$event.target'])

	onInput(target: HTMLInputElement): void
	{
		this.adjustInputWidth(target);
	}

	ngAfterViewInit(): void
	{
		// Adjust the input width initially if there is some content.
		this.adjustInputWidth(this.el.nativeElement);
	}

	private adjustInputWidth(input: HTMLInputElement): void
	{
		const extraPixel = 2;
		this.renderer.setStyle(input, 'width', 'auto'); // Reset width to auto
		this.renderer.setStyle(input, 'width', `${input.scrollWidth + extraPixel}px`);

	}

}
