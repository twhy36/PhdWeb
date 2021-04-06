import { Component, Input, Output, EventEmitter, ContentChildren, QueryList } from '@angular/core';
import { PhdTabPanelDirective } from './tab-panel.directive';

@Component({
    selector: 'phd-tabView',
    templateUrl: './tab-view.component.html',
	styleUrls: ['./tab-view.component.scss']
})
export class PhdTabViewComponent {
	@Input() orientation: string;
	@Input() styleClass: string;

	@Output() onTabClick = new EventEmitter<{ originalEvent: any, tab: any }>();
	@ContentChildren(PhdTabPanelDirective) tabs: QueryList<PhdTabPanelDirective>;

	tabClick(event: any)
	{
		this.onTabClick.emit(event);
	}
}
