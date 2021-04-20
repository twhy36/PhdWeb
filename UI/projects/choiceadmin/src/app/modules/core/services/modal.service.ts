import { Injectable } from '@angular/core';

import { ModalRef, IModalOptions } from '../../shared/classes/modal.class';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Injectable()
export class ModalService
{
	constructor(private modalService: NgbModal)
	{

	}

	private defaultModalOptions: IModalOptions = {
		centered: true,
		backdrop: 'static'
	};

	/**
	 * Opens a default modal window. Will set default options if none are provided.
	 * @param content
	 * @param options
	 */
	open(content: any, options?: IModalOptions): ModalRef
	{
		// combine defaults with passed in options.
		options = { ...this.defaultModalOptions, ...options };

		let modalRef = new ModalRef(this.modalService.open(content, options));

		// will be undefined if a templateRef is used
		if (modalRef.componentInstance)
		{
			// set the modalRef for ModalContentComponent
			modalRef.componentInstance.modalRef = modalRef;
		}

		return modalRef;
	}
}
