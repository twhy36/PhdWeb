import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { Observable } from 'rxjs';
import { ConfirmDialogComponent } from '../../mobile/shared/confirm-dialog/confirm-dialog.component';
import { map, take } from 'rxjs/operators';

@Injectable()
export class DialogService
{
	confirmDialogRef: MatDialogRef<ConfirmDialogComponent>;

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

	public confirmed(): Observable<ConfirmDialogComponent>
	{
		return this.confirmDialogRef.afterClosed().pipe(take(1), map(res =>
		{
			return res;
		}));
	}
}
