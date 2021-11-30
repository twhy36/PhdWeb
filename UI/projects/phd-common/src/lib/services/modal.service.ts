import { Injectable } from '@angular/core';
import { Subject, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ModalOptions, ModalRef, IModalOptions } from '../utils/modal.class';
import { ModalMessages } from '../utils/constants.class';
import { ModalComponent } from '../components/modal/modal.component';

@Injectable()
export class ModalService
{
	modalObs: Subject<ModalOptions<any>>;

	constructor(private modalService: NgbModal)
	{
		this.modalObs = new Subject<ModalOptions<any>>();
	}

	private defaultModalOptions: IModalOptions = {
		centered: true,
		backdrop: 'static'
	};

	showModal<TResult>(options: ModalOptions<TResult>)
	{
		const result = this.startModal(options);

		return result;
	}

	showOkOnlyModal(message: string, title: string = '', headerRemoveMargin?: boolean)
	{
		const options = new ModalOptions<boolean>();

		options.content = message;
		options.type = 'normal';
		options.header = title.length ? title : 'Warning';
		options.buttons = [{ 'text': 'Ok', 'cssClass': ['btn-primary'], 'result': true }];
		options.headerRemoveMargin = headerRemoveMargin;
		const result = this.startModal(options, true);

		return result;
	}

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

	showConfirmModal(content: string)
	{
		const options = new ModalOptions<boolean>();

		options.content = content;
		options.type = 'normal';
		options.header = 'Warning';
		options.buttons = [{ 'text': 'Okay', 'cssClass': ['btn-primary'], 'result': true }];

		return this.showModal(options);
	}

	showOverrideModal(content: string)
	{
		const options = new ModalOptions<string>();

		options.content = content;
		options.needsInput = true;
		options.type = 'normal';
		options.header = 'Warning';
		options.buttons = [
			{ 'text': 'Save', 'cssClass': ['btn-primary'], 'result': 'textInput', 'disable': true },
			{ 'text': 'Cancel', 'cssClass': ['btn-primary'], 'result': 'Close' }
		];
		options.inputLabel = 'Override Reason';

		return this.showModal(options);
	}

	showWarningModal(content: string)
	{
		const options = new ModalOptions<boolean>();

		options.content = content;
		options.type = 'confirmation';
		options.header = 'Warning';
		options.buttons = [
			{ 'text': 'No', 'cssClass': ['btn-light'], 'result': false },
			{ 'text': 'Yes', 'cssClass': ['btn-secondary'], 'result': true }
		];

		return this.showModal(options);
	}

	showSuccessModal()
	{
		const options = new ModalOptions<any>();

		options.content = ModalMessages.Success;
		options.type = 'success';

		return this.showModal(options);
	}

	showErrorModal(errorMessage: string = null)
	{
		const options = new ModalOptions<boolean>();

		if (errorMessage)
		{
			options.content = errorMessage;
		}
		else
		{
			options.content = ModalMessages.Error;
		}

		options.type = 'normal';
		options.header = 'Error!!';
		options.buttons = [{ 'text': 'Okay', 'cssClass': ['btn-primary'], 'result': true }];

		return this.showModal(options);
	}

	showUnsavedModal()
	{
		const options = new ModalOptions<boolean>();

		options.content = ModalMessages.Unsaved;
		options.type = 'confirmation';
		options.header = 'Warning';
		options.buttons = [
			{ 'text': 'No', 'cssClass': ['btn-light'], 'result': false },
			{ 'text': 'Yes', 'cssClass': ['btn-secondary'], 'result': true }
		];

		return this.showModal(options);
	}

	private startModal<TResult>(options: ModalOptions<TResult>, useCompactStyle: boolean = false)
	{
		this.modalObs.next(options);
		const defaultOptions = {...this.defaultModalOptions};

		if (useCompactStyle)
		{
			defaultOptions.windowClass = 'phd-modal-window';
		}

		const confirm = this.modalService.open(ModalComponent, defaultOptions);

		confirm.componentInstance.modalRef = confirm;
		confirm.componentInstance.content = options.content;
		confirm.componentInstance.modalType = options.type;
		confirm.componentInstance.showModal = false;
		confirm.componentInstance.buttons = options.buttons;
		confirm.componentInstance.header = options.header;
		confirm.componentInstance.needsInput = options.needsInput;
		confirm.componentInstance.headerRemoveMargin = options.headerRemoveMargin;
		
		return from(confirm.result).pipe(
			map(res => res as TResult)
		);
	}

}
