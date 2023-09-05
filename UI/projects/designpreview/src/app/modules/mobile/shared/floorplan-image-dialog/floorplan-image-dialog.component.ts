import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
	selector: 'floorplan-image-dialog',
	templateUrl: './floorplan-image-dialog.component.html',
	styleUrls: ['./floorplan-image-dialog.component.scss'],
// eslint-disable-next-line indent
})
export class FloorplanImageDialogComponent 
{
	constructor(
		@Inject(MAT_DIALOG_DATA)
		public data: {
			selectedIndex: number;
		},
		private matDialogRef: MatDialogRef<FloorplanImageDialogComponent>
	) {}

	public cancel()
	{
		this.matDialogRef.close();
	}
}
