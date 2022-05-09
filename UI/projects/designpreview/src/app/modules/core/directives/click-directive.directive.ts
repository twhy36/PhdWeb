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
			const element = targetElement?.tagName;
			let text;
			if (element === 'I') {
				// grabs what type of icon it is
				const indexOfIcon = targetElement?.className?.indexOf('fa-');
				if (indexOfIcon > 0) {
					text = targetElement.className.substring(indexOfIcon);
					text = text.substr(0, text.indexOf(' '));
				} else {
					text = targetElement?.className
				}
			} else if (element === 'IMG') {
				text = (targetElement as HTMLImageElement)?.src;
			} else if (element === 'INPUT') {
				text = (targetElement as HTMLInputElement)?.placeholder;
			} else {
				text = targetElement?.textContent;
			}
			this.adobeService.setClickEvent(container, element, text);

	}

	// custom tags must always include - whereas native html tags will never include -
	getContainerName(element: HTMLElement) : string {
		if (element?.className?.includes('mat-menu-item')) {
			// special case for mat menu items as their parent elements are outside the app-root
			return 'MAT-MENU-ITEM'
		} else if (element?.tagName?.includes('-')) {
			return element.tagName;
		} else if (element?.parentElement) {
			return this.getContainerName(element.parentElement);
		} else {
			return '';
		}
	}

}
