import { Component, HostListener, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
	selector: 'confirm-dialog',
	templateUrl: './confirm-dialog.component.html',
	styleUrls: ['./confirm-dialog.component.scss']
	})
export class ConfirmDialogComponent 
{

	constructor(
		@Inject(MAT_DIALOG_DATA) public data: {
			cancelText: string,
			confirmText: string,
			displayClose: boolean,
			message: string,
			title: string},
		private matDialogRef: MatDialogRef<ConfirmDialogComponent>) {}

	public cancel() 
	{
		this.close(false);
	}

	public close(value) 
	{
		this.matDialogRef.close(value);
	}

	public confirm() 
	{
		this.close(true);
	}

	@HostListener("keydown.esc") 
	public onEsc() 
	{
		this.close(false);
	}
}
