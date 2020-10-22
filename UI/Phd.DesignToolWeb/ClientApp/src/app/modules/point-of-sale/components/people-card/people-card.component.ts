import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Buyer } from '../../../shared/models/buyer.model';
import { Realtor } from '../../../shared/models/sales-agreement.model';

type Person = "Buyer" | "Trust" | "Realtor";

@Component({
	selector: 'people-card',
	templateUrl: './people-card.component.html',
	styleUrls: ['./people-card.component.scss']
})
export class PeopleCardComponent implements OnInit
{
	@Input() personType: Person;
	@Input() person: Buyer;
	@Input() coBuyerNA: boolean;
	@Input() trust: string;
	@Input() trustNA: boolean;
	@Input() realtor: Realtor;
	@Input() realtorNA: boolean;
	@Input() isChangingOrder: boolean = false;
	@Input() canEditAgreement: boolean = true;
	@Input() canSell: boolean = true;
	@Input() originalSignersCount: number;
	@Input() salesAgreementStatus: string;

	@Output() onEdit = new EventEmitter<Buyer | Realtor | string>();
	@Output() onDelete = new EventEmitter<Buyer>();
	@Output() onSetAsPrimaryBuyer = new EventEmitter<Buyer>();
	@Output() onSetAsNA = new EventEmitter();
	@Output() onAddRealtor = new EventEmitter();
	@Output() onAddTrust = new EventEmitter();
	@Output() onAddCoBuyer = new EventEmitter();

	constructor() { }

	get personContact()
	{
		let contact = this.person && this.person.opportunityContactAssoc && this.person.opportunityContactAssoc.contact;

		return contact || null;
	}

	ngOnInit()
	{

	}

	addTrust()
	{
		this.onAddTrust.emit();
	}

	addRealtor()
	{
		this.onAddRealtor.emit();
	}

	addCoBuyer()
	{
		this.onAddCoBuyer.emit();
	}

	edit()
	{
		switch (this.personType)
		{
			case "Buyer":
				this.onEdit.emit(this.person);
				break;
			case "Trust":
				this.onEdit.emit(this.trust);
				break;
			default:
				this.onEdit.emit(this.realtor);
				break;
		}
	}

	delete()
	{
		this.onDelete.emit(this.person);
	}

	setAsPrimaryBuyer()
	{
		this.onSetAsPrimaryBuyer.emit(this.person);
	}

	setAsNA()
	{
		this.onSetAsNA.emit();
	}

	canEditBuyer() {
		return this.canSell && (this.salesAgreementStatus === 'Pending' || this.salesAgreementStatus === 'OutforSignature'
			|| this.salesAgreementStatus === 'Signed' || this.salesAgreementStatus === 'Approved');
	}
}
