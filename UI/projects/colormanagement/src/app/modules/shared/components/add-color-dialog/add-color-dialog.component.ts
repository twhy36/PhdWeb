import { Component, OnInit, ViewChild } from '@angular/core';
import { UnsubscribeOnDestroy, ModalRef } from 'phd-common';
import { ModalService } from '../../../core/services/modal.service';

@Component({
  selector: 'add-color-dialog',
  templateUrl: './add-color-dialog.component.html',
  styleUrls: ['./add-color-dialog.component.scss']
})
export class AddColorDialogComponent extends UnsubscribeOnDestroy  implements OnInit {
	@ViewChild('updateChangeOrderModal') updateChangeOrderModal: any;
	isModalOpen: boolean = false;
	modalReference: ModalRef;

  constructor(private modalService: ModalService)
  {
	super();
  }

  ngOnInit(): void {
  }

  openModal(content: any)
  {
	  this.modalReference = this.modalService.open(content);

	  this.isModalOpen = true;

	  this.modalReference.result.catch(err => console.log(err));
  }
}
