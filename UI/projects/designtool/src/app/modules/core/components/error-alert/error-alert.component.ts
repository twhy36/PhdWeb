import { Component, OnInit } from '@angular/core';
import { ActionsSubject } from '@ngrx/store';
import { filter } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { ErrorAction } from '../../../ngrx-store/error.action';

@Component({
	selector: 'error-alert',
	templateUrl: './error-alert.component.html',
	styleUrls: ['./error-alert.component.scss']
})

export class ErrorAlertComponent implements OnInit
{
	constructor(private actionsSubject: ActionsSubject, private toastr: ToastrService) { }

	ngOnInit() {
		this.actionsSubject.pipe(
			filter(action => action instanceof ErrorAction)
		).subscribe(action => {
			const errorAction = action as ErrorAction;
			const errorMessage = errorAction.friendlyMessage ? errorAction.friendlyMessage : "An error occurred!!";

			this.toastr.error(errorMessage, 'Error');
		});
	}
}
