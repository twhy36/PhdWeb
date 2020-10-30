export interface CrmContact
{
	contactid: string;
	fullname: string;
	salutation: string;
	firstname: string;
	middlename: string;
	lastname: string;
	suffix: string;
	preferredcontactmethodcode: number;
	'preferredcontactmethodcode@OData.Community.Display.V1.FormattedValue': string;
	jobtitle: string;
	emailaddress1: string;
	emailaddress2: string;
	emailaddress3: string;
	address1_stateorprovince: string;
	address1_country: string;
	address1_city: string;
	address1_postalcode: string;
	address1_line1: string;
	address1_line2: string;
	address1_county: string;
	address2_stateorprovince: string;
	address2_country: string;
	address2_city: string;
	address2_postalcode: string;
	address2_line1: string;
	address2_line2: string;
	address2_county: string;
	address3_stateorprovince: string;
	address3_country: string;
	address3_city: string;
	address3_postalcode: string;
	address3_line1: string;
	address3_line2: string;
	address3_county: string;
	telephone1: string;
	telephone2: string;
	donotemail: boolean;
	donotphone: boolean;
	pulte_donotallowtext: boolean;
	donotpostalmail: boolean;
}

export interface IContact
{
	id: number,
	prefix: string,
	firstName: string,
	middleName: string,
	lastName: string,
	suffix: string,
	preferredCommunicationMethod: PreferredCommunicationMethod,
	dynamicsIntegrationKey: string,
	addressAssocs: Array<AddressAssoc>,
	emailAssocs: Array<EmailAssoc>,
	phoneAssocs: Array<PhoneAssoc>
}

export class Contact
{
	id = 0;
	prefix: string = null;
	firstName: string = null;
	middleName: string = null;
	lastName: string = null;
	suffix: string = null;
	preferredCommunicationMethod: PreferredCommunicationMethod = null;
	dynamicsIntegrationKey: string;
	addressAssocs: Array<AddressAssoc> = [];
	emailAssocs: Array<EmailAssoc> = [];
	phoneAssocs: Array<PhoneAssoc> = [];

	constructor(dto: IContact = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.prefix = dto.prefix;
			this.firstName = dto.firstName;
			this.middleName = dto.middleName;
			this.lastName = dto.lastName;
			this.suffix = dto.suffix;
			this.preferredCommunicationMethod = dto.preferredCommunicationMethod;
			this.dynamicsIntegrationKey = dto.dynamicsIntegrationKey;
			this.addressAssocs = dto.addressAssocs ? dto.addressAssocs.map(a => new AddressAssoc(a)) : null;
			this.emailAssocs = dto.emailAssocs ? dto.emailAssocs.map(e => new EmailAssoc(e)) : null;
			this.phoneAssocs = dto.phoneAssocs ? dto.phoneAssocs.map(p => new PhoneAssoc(p)) : null;
		}
	}
}

export class MatchingContact extends Contact
{
	isExactMatch: boolean;

	constructor(dto: MatchingContact)
	{
		super(dto);

		this.isExactMatch = dto.isExactMatch;
	}
}

export interface IAddressAssoc
{
	id: number,
	doNotContact: boolean,
	isPrimary: boolean,
	address: IAddress
}

export class AddressAssoc
{
	id = 0;
	doNotContact = false;
	isPrimary = false;
	address: Address = null;

	constructor(dto: IAddressAssoc = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.doNotContact = dto.doNotContact;
			this.isPrimary = dto.isPrimary;
			this.address = new Address(dto.address);
		}
	}
}

export interface IAddress
{
	id: number,
	address1: string,
	address2: string,
	city: string,
	stateProvince: string,
	postalCode: string,
	county: string,
	country: string
}
export class Address
{
	id = 0;
	address1: string = null;
	address2: string = null;
	city: string = null;
	stateProvince: string = null;
	postalCode: string = null;
	county: string = null;
	country: string = null;

	constructor(dto: IAddress)
	{
		if (dto)
		{
			this.id = dto.id;
			this.address1 = dto.address1;
			this.address2 = dto.address2;
			this.city = dto.city;
			this.stateProvince = dto.stateProvince;
			this.postalCode = dto.postalCode;
			this.county = dto.county;
			this.country = dto.country;
		}
	}
}

export interface IEmailAssoc
{
	id: number,
	doNotContact: boolean,
	isPrimary: boolean,
	email: IEmail
}

export class EmailAssoc
{
	id = 0;
	doNotContact = false;
	isPrimary = false;
	email: Email = null;

	constructor(dto: IEmailAssoc = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.doNotContact = dto.doNotContact;
			this.isPrimary = dto.isPrimary;
			this.email = new Email(dto.email);
		}
	}
}

export interface IEmail
{
	id: number,
	emailAddress: string
}
export class Email
{
	id = 0;
	emailAddress: string = null;

	constructor(dto: IEmail = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.emailAddress = dto.emailAddress;
		}
	}
}

export interface IPhoneAssoc
{
	id: number,
	doNotContact: boolean,
	isPrimary: boolean,
	phone: IPhone
}

export class PhoneAssoc
{
	id = 0;
	doNotContact = false;
	isPrimary = false;
	phone: Phone = null;

	constructor(dto: IPhoneAssoc = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.doNotContact = dto.doNotContact;
			this.isPrimary = dto.isPrimary;
			this.phone = new Phone(dto.phone);
		}
	}
}

export interface IPhone
{
	id: number,
	phoneType: PhoneType,
	phoneNumber: string,
	phoneExt: string
}

export class Phone
{
	id = 0;
	phoneType: PhoneType = null;
	phoneNumber: string = null;
	phoneExt: string = null;

	constructor(dto: IPhone = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.phoneType = dto.phoneType;
			this.phoneNumber = dto.phoneNumber;
			this.phoneExt = dto.phoneExt;
		}
	}
}

export enum PreferredCommunicationMethod
{
	Phone = "Phone",
	Text = "Text",
	Email = "Email",
	Mail = "Mail",
	Fax = "Fax"
}

export enum PhoneType
{
	Mobile = "Mobile",
	Business = "Business",
	Home = "Home",
	Fax = "Fax"
}
