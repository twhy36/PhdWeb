import { TemplateRef } from '@angular/core';

import { NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { UnsubscribeOnDestroy } from 'phd-common';

export interface IModalOptions extends NgbModalOptions
{

}

export class ModalButton<TResult>
{
	text: string;
	cssClass: string[];
	result: TResult;
	disable?= false;
}

export class ModalOptions<TResult>
{
	content: string | TemplateRef<any>;
	type?: string;
	buttons?: ModalButton<TResult>[];
	header?: string;
	inputLabel?: string;
	needsInput?: boolean;
}

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

export abstract class ModalContent extends UnsubscribeOnDestroy
{
	private _modalRef: ModalRef;

	constructor()
	{
		super();
	}

	set modalRef(mr: ModalRef)
	{
		this._modalRef = mr;
	}

	get modalRef(): ModalRef
	{
		return this._modalRef;
	}

	dismiss(reason?: any)
	{
		this.modalRef.dismiss(reason);
	}

	close(result?: any)
	{
		this.modalRef.close(result);
	}
}
