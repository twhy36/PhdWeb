import { Component, Input } from '@angular/core';

@Component({ selector: 'floorplan-image-tabs', template: '' })
export class FloorplanImageTabsStubComponent 
{
	@Input() showExpandImageIcons: boolean;
	@Input() imageHeight: string;
	@Input() selectedIndex: number;
	@Input() showImageContainerBorder: boolean;
}