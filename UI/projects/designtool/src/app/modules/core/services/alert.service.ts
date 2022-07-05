import { Injectable } from '@angular/core';
import { Observable, from as fromPromise } from 'rxjs';
import { ModalRef, ModalService } from 'phd-common';
import { ConfirmModalComponent } from '../components/confirm-modal/confirm-modal.component';

@Injectable()
export class AlertService
{
	private modal: ModalRef;

	constructor(private modalService: ModalService) { }

	public open(): Observable<boolean>
	{
		this.modal = this.modalService.open(ConfirmModalComponent);

		this.modal.componentInstance.title = 'Warning!';
		this.modal.componentInstance.body = 'If you continue you will lose your changes.<br/><br/>Do you wish to continue?';
		this.modal.componentInstance.defaultOption = 'Cancel';

		return fromPromise(this.modal.result.then((result) => result == 'Continue' ? true : false).catch(() => false));
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
