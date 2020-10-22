import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent } from '../components/confirm-modal/confirm-modal.component';

@Injectable()
export class UiUtilsService
{
	constructor(private _modalService: NgbModal) { }

	highlightParentRow(event)
	{
		if (event)
		{
			const thisEle = <HTMLElement>event.target;
			const trEle = thisEle.closest('tr');

			this.clearHighlightParentRow();

			//make this element active
			trEle.classList.add('selected');
		}
	}

	clearHighlightParentRow()
	{
		//remove other active classes
		let elements = document.getElementsByClassName('selected');

		for (let i = 0; i < elements.length; i++)
		{
			elements.item(i).classList.remove('selected');
		}
	}

	scrollToSelectedRow()
	{
		const selectedEles = <HTMLElement[]><any>document.getElementsByClassName('selected');

		if (selectedEles.length > 0)
		{
			//wait for css transition on another element
			setTimeout(() =>
			{
				selectedEles[0].scrollIntoView();
			}, 250);
		}
	}

	scrollToId(id: string)
	{
		const selectedEle = <HTMLElement><any>document.getElementById(id);

		if (selectedEle)
		{
			//wait for css transition on another element
			setTimeout(() =>
			{
				selectedEle.scrollIntoView();
			}, 250);
		}
	}

	confirmCancellation(): Promise<boolean> {
		let message = `If you continue you will lose your changes.`;
		return this.showConfirmation(message);
	}

	showConfirmation(message: string): Promise<boolean> {
		let msgBody = message + `<br><br>`;
		msgBody += `Do you wish to continue?`;

		let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Cancel';

		return confirm.result.then((result) => {
			return result === 'Continue';
		}, (reason) => {
				return false;
		});
	}
}
