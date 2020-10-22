import { NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

export class ModalRef
{
	private _modalRef: NgbModalRef;

	constructor(modalRef: NgbModalRef)
	{
		this._modalRef = modalRef;
	}

	get result(): Promise<any>
	{
		return this._modalRef.result;
	}

	get componentInstance(): any
	{
		return this._modalRef.componentInstance;
	}

	close(result?: any)
	{
		return this._modalRef.close(result);
	}

	dismiss(reason?: any)
	{
		return this._modalRef.dismiss(reason);
	}
}

export interface IModalOptions extends NgbModalOptions
{

}
