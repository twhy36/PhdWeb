import { Component, Input } from '@angular/core';

@Component({
	selector: 'build-version',
	templateUrl: './build-version.component.html',
	styleUrls: ['./build-version.component.scss']
})
export class BuildVersionComponent
{
	@Input() branch: string = '';
	@Input() version: string = '';

	constructor() { }

	dismiss(target: any): void
	{
		target.classList.add('hidden');
	}
}