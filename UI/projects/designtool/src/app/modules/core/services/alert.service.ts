import { Injectable } from '@angular/core';
import { Observable, from as fromPromise } from 'rxjs';
import { Constants, ModalRef, ModalService } from 'phd-common';
import { ConfirmModalComponent } from '../components/confirm-modal/confirm-modal.component';

@Injectable()
export class AlertService
{
	private modal: ModalRef;

	constructor(private modalService: ModalService) { }

	public open(): Observable<boolean>
	{
		this.modal = this.modalService.open(ConfirmModalComponent);

		this.modal.componentInstance.title = Constants.WARNING;
		this.modal.componentInstance.body = Constants.LOSE_CHANGES;
		this.modal.componentInstance.defaultOption = Constants.CANCEL;

		return fromPromise(this.modal.result.then((result) => result == Constants.CONTINUE ? true : false).catch(() => false));
	}

	public close()
	{
		this.modal.dismiss();
	}

	public continue()
	{
		this.modal.close();
	}
}
