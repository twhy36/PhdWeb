import { Injectable } from '@angular/core';
import { Observable, from as fromPromise } from 'rxjs';
import { ModalService } from './modal.service';
import { ModalRef } from '../../shared/classes/modal.class';

@Injectable()
export class AlertService
{
	public content: any;
	private modal: ModalRef;

	constructor(private modalService: ModalService)
	{

	}

	public open(): Observable<boolean>
	{
		this.modal = this.modalService.open(this.content);

		return fromPromise(this.modal.result.then(() => true).catch(() => false));
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
