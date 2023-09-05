import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { ConfirmDialogComponent } from '../../mobile/shared/confirm-dialog/confirm-dialog.component';
import { FloorplanImageDialogComponent } from '../../mobile/shared/floorplan-image-dialog/floorplan-image-dialog.component';

@Injectable()
export class DialogService
{
	confirmDialogRef: MatDialogRef<ConfirmDialogComponent> | MatDialogRef<FloorplanImageDialogComponent>;

	constructor(private dialog: MatDialog) {}

	public open(options)
	{
		this.confirmDialogRef = this.dialog.open(ConfirmDialogComponent, {
			data: {
				cancelText: options.cancelText,
				confirmText: options.confirmText,
				displayClose: options.displayClose,
				message: options.message,
				title: options.title
			}
		})
	}

	public openImageDialog(options)
	{
		this.confirmDialogRef = this.dialog.open(FloorplanImageDialogComponent, {
			height: '95%',
			width: '100%',
			data: {
				selectedIndex: options.selectedIndex
			},
		});
	}

	public confirmed(): Observable<ConfirmDialogComponent | FloorplanImageDialogComponent>
	{
		return this.confirmDialogRef.afterClosed().pipe(take(1), map(res =>
		{
			return res;
		}));
	}
}
