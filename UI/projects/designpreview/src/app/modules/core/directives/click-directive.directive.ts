import { Directive, ElementRef, HostListener } from '@angular/core';
import { AdobeService } from '../services/adobe.service';

@Directive({
  selector: '[clickDirective]'
})
export class ClickDirective {

  constructor(private adobeService: AdobeService) {
	}

	@HostListener('document:click', ['$event', '$event.target'])
	public onClick($event: MouseEvent, targetElement: HTMLElement): void {
			if (!targetElement) {
					return;
			}

			const container = this.getContainerName(targetElement);
			let text, element;

			if (targetElement?.className?.includes('phd-empty-checkbox') || targetElement?.className?.includes('fa-check-square')){
				element = 'checkbox';
				text = 'contracted options'
			} else if (targetElement?.tagName === 'I') {
				// grabs what type of icon it is
				const indexOfIcon = targetElement?.className?.indexOf('fa-');
				if (indexOfIcon > 0) {
					text = targetElement.className.substring(indexOfIcon);
					text = text.substr(0, text.indexOf(' '));
				} else {
					text = targetElement?.className
				}
				element = 'button';
			} else if (targetElement?.tagName === 'BUTTON') {
				text = targetElement?.textContent;
				element = 'button';
			} else if (targetElement?.tagName === 'div' && targetElement?.className?.includes('phd-clickable')) {
				text = targetElement?.textContent;
				element = 'link';
			} else if (targetElement?.tagName === 'IMG') {
				text = (targetElement as HTMLImageElement)?.src;
				element = 'image';
			} else if (targetElement?.tagName === 'A') {
				text = targetElement?.textContent;
				element = 'nav';
			} else if (container === 'ribbon') {
				text = targetElement?.textContent;
				element = 'nav';
			}
			if (!!element) {
				this.adobeService.setClickEvent(container, element, text);
			}

	}

	// get which type of container it is in, ribbon, header, footer, or body.
	getContainerName(element: HTMLElement) : string {
		if (element?.className?.toLocaleLowerCase()?.includes('mat-menu-item')) {
			return 'ribbon'
		} else if (element?.tagName?.toLocaleLowerCase()?.includes('nav-bar')) {
			return 'header';
		} else if (element?.tagName?.toLocaleLowerCase()?.includes('group-bar')) {
			return 'ribbon';
		} else if (element?.tagName?.toLocaleLowerCase()?.includes('action-bar')) {
			return 'footer';
		} else if (element?.parentElement) {
			return this.getContainerName(element.parentElement);
		} else {
			return 'body';
		}
	}

}
