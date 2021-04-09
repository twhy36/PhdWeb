import { Component, OnInit, Input } from '@angular/core';
import { Address, AddressAssoc } from 'phd-common';

type Person = "Buyer" | "Trust" | "Realtor";

@Component({
	selector: 'people-card-address',
	templateUrl: './people-card-address.component.html',
	styleUrls: ['./people-card-address.component.scss']
})
export class PeopleCardAddressComponent implements OnInit
{
	@Input() address: Address;

	constructor() { }

	ngOnInit()
	{

	}
}
