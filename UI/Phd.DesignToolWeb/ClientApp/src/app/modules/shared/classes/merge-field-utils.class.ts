import { SalesAgreement } from "../models/sales-agreement.model";
import { Job } from "../models/job.model";
import { PhoneType, Contact } from "../models/contact.model";
import { DecisionPoint, Group } from "../models/tree.model.new";
import { isNullOrEmpty, isNull } from "./string-utils.class";
import { monthRange, addMonths } from "./date-utils.class";
import { PriceBreakdown } from "../models/scenario.model";
import { FinancialCommunity } from "../models/community.model";
import { SDGroup, SDSubGroup, SDPoint, SDChoice } from "../models/summary.model";
import { Buyer } from "../models/buyer.model";
import { ChangeOrderChoice } from "../models/job-change-order.model";
import { MergeFieldDto } from "../models/contract.model";
import * as _ from 'lodash';

export function convertMapToMergeFieldDto(map: Map<string, string>): MergeFieldDto[]
{
	let dto: MergeFieldDto[] = [];

	// cast map to any to avoid typescript yelling at you
	for (let [k, v] of map as any)
	{
		dto.push({ fieldName: k, fieldValue: v } as MergeFieldDto);
	}

	return dto;
}

export function getCurrentHouseSelections(groups: Array<Group>)
{
	const selectionSummary = groups.map(g =>
	{
		let group = new SDGroup(g);

		group.subGroups = g.subGroups.map(sg =>
		{
			let subGroup = new SDSubGroup(sg);

			subGroup.points = sg.points.map(p =>
			{
				let point = new SDPoint(p);

				point.choices = p.choices.map(c =>
				{
					let choice = new SDChoice(c);

					return choice;
				}).filter(c => c.quantity > 0);

				return point;
			}).filter(dp => !!dp.choices.length)

			return subGroup;
		}).filter(sg => !!sg.points.length);

		return group;
	}).filter(g => !!g.subGroups.length);

	return selectionSummary;
}

let formatPhoneNumber = (str) => {
	//Filter numbers
	let numbers = ('' + str).replace(/\D/g, '');

	//Check if input matches the length
	let match = numbers.match(/^(\d{3})(\d{3})(\d{4})$/);

	if (match) {
		return '(' + match[1] + ') ' + match[2] + '-' + match[3]
	};
	return null;
};

export function getChangeOrderGroupSelections(groups: Array<Group>, jobChangeOrderChoices: Array<ChangeOrderChoice>)
{
	return _.flatMap(groups, g => {
		return _.flatMap(g.subGroups, sg => {
			return sg.points.map(dp => {
				let point = new SDPoint(dp);
				point.groupName = g.label;
				point.subGroupName = sg.label;

				point.choices = dp.choices.map<SDChoice>(ch => {
					let c = jobChangeOrderChoices.find(c => c.divChoiceCatalogId === ch.divChoiceCatalogId);
					if (!!c) {
						let choice = new SDChoice(ch);
						choice.quantity = c.quantity;
						if (dp.dPointTypeId === 1) {
							choice.isElevationChoice = true;
						}
						return choice;
					} else {
						return null;
					}
				}).filter(ch => !!ch);

				return point;
			}).filter(dp => dp.choices.length);
		});
	});
}

export function mapSystemMergeFields(sag: SalesAgreement, job: Job, elevationDp: DecisionPoint, price: PriceBreakdown, financialCommunity: FinancialCommunity, buyers: Buyer[], handing: string)
{
	// deposits
	const sagDeposits = !!sag.deposits ? sag.deposits : [];
	const deposits_earnest = sagDeposits.filter(d => d.depositTypeDesc.includes("EarnestMoney"));
	const deposits_options = sagDeposits.filter(d => d.depositTypeDesc.includes("Option"));
	const deposits_down = sagDeposits.filter(d => d.depositTypeDesc === "DownPayment");
	const deposits_other = sagDeposits.filter(d => d.depositTypeDesc === "Other");

	// itemized deposits
	const deposits_earnest_itemized = '<<tab>>Amount<<tab>>Description<<tab>>Date Due<<tab>>Date Paid' +
		deposits_earnest.map(d => `<<tab>>${d.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}<<tab>>${d.description}<<tab>>${!!d.dueDate ? (new Date(d.dueDate)).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : ""}<<tab>>${!!d.paidDate ? (new Date(d.paidDate)).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : ""}`).join("<<break>>");
	const deposits_options_itemized = '<<tab>>Amount<<tab>>Description<<tab>>Date Due<<tab>>Date Paid' +
		deposits_options.map(d => `<<tab>>${d.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}<<tab>>${d.description}<<tab>>${!!d.dueDate ? (new Date(d.dueDate)).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : ""}<<tab>>${!!d.paidDate ? (new Date(d.paidDate)).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : ""}`).join("<<break>>");
	const deposits_down_itemized = '<<tab>>Amount<<tab>>Description<<tab>>Date Due<<tab>>Date Paid' +
		deposits_down.map(d => `<<tab>>${d.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}<<tab>>${d.description}<<tab>>${!!d.dueDate ? (new Date(d.dueDate)).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : ""}<<tab>>${!!d.paidDate ? (new Date(d.paidDate)).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : ""}`).join("<<break>>");
	const deposits_other_itemized = '<<tab>>Amount<<tab>>Description<<tab>>Date Due<<tab>>Date Paid' +
		deposits_other.map(d => `<<tab>>${d.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}<<tab>>${d.description}<<tab>>${!!d.dueDate ? (new Date(d.dueDate)).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : ""}<<tab>>${!!d.paidDate ? (new Date(d.paidDate)).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : ""}`).join("<<break>>");
	const deposits_itemized = '<<tab>>Amount<<tab>>Description<<tab>>Date Due<<tab>>Date Paid' +
		sagDeposits.map(d => `<<tab>>${d.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}<<tab>>${d.description}<<tab>>${!!d.dueDate ? (new Date(d.dueDate)).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : ""}<<tab>>${!!d.paidDate ? (new Date(d.paidDate)).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : ""}`).join("<<break>>");

	// deposits due
	const deposit_next_due_earnest = sagDeposits.filter(d => d.depositTypeDesc === "EarnestMoney" && d.paidDate === null).sort((a, b) => a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0);
	const deposit_next_due = sagDeposits.filter(d => !d.paidDate).sort((a, b) => a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0);

	// latest deposit paid
	const deposit_current_paid = sagDeposits.filter(d => !!d.paidDate).sort((a, b) => a.dueDate > b.dueDate ? -1 : a.dueDate < b.dueDate ? 1 : 0);

	// Buyers
	const customers = buyers ? buyers
		.sort((a, b) => a.isPrimaryBuyer ? -1 : (b.isPrimaryBuyer ? 1 : a.sortKey - b.sortKey))
		.map(b =>
		{
			return b.opportunityContactAssoc.contact;
		}) : [] as Contact[];

	let customerNames = customers ? customers.map(c => `${c.firstName}${c.middleName ? ' ' + c.middleName : ''} ${c.lastName}${c.suffix ? ' ' + c.suffix : ''}`) : [];

	if (!!sag.trustName)
	{
		customerNames.splice(1, 0, sag.trustName);
	}

	const primBuyer = buyers ? buyers.find(b => b.isPrimaryBuyer) : null;
	const coBuyers = buyers ? buyers.filter(b => !b.isPrimaryBuyer).sort((a, b) => a.sortKey === b.sortKey ? 0 : a.sortKey < b.sortKey ? -1 : 1) : [] as Buyer[];

	const primaryBuyer = primBuyer ? primBuyer.opportunityContactAssoc.contact : new Contact();
	const customerAddress = primaryBuyer.addressAssocs.find(a => a.isPrimary);
	const customerHomePhone = primaryBuyer.phoneAssocs.find(p => p.isPrimary);
	const customerWorkPhone = primaryBuyer.phoneAssocs.find(p => p.phone.phoneType === PhoneType.Business);
	const customerMobilePhone = primaryBuyer.phoneAssocs.find(p => p.phone.phoneType === PhoneType.Mobile);
	const customerEmail = primaryBuyer.emailAssocs.find(e => e.isPrimary);
	const customerFax = primaryBuyer.phoneAssocs.find(p => p.phone.phoneType === PhoneType.Fax);

	const ecoeDate = !!sag.ecoeDate ? new Date(sag.ecoeDate) : null;
	const ecoeDateString = !!ecoeDate ? (new Date(ecoeDate)).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : null;

	const jio = job.changeOrderGroups.find(a => a.jobChangeOrderGroupDescription === "Pulte Home Designer Generated Job Initiation Change Order");
	const jioCreatedDate = jio ? new Date(jio.createdUtcDate) : null;
	const sagCreatedDate = jioCreatedDate ? jioCreatedDate.toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : null;
	const sagApprovedDate = !!sag.approvedDate ? (new Date(sag.approvedDate)).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : null;
	const sagSignedDate = !!sag.signedDate ? (new Date(sag.signedDate)).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : null;
	const jioDescription = jio ? jio.jobChangeOrderGroupDescription : "";
	const jioCreatedBy = jio && jio.contact ? jio.contact.displayName : "";
	const buildType = job.lot ? job.lot.lotBuildTypeDesc : "";

	let sagCancelDate: Date = null;
	let sagCancelReason: string = null;
	let sagCancelDetail: string = null;

	if (sag.status === "Cancel")
	{
		sagCancelDate = new Date(sag.statusUtcDate);
	}

	const salesProgram = sag.programs && sag.programs.find(p => p.salesProgram.salesProgramType === "DiscountFlatAmount");
	const buyerClosingCost = sag.programs && sag.programs.find(p => p.salesProgram.salesProgramType === "BuyersClosingCost");
	const elevationChoice = elevationDp && elevationDp.choices.find(c => c.quantity > 0);
	const realtor = sag.realtors && sag.realtors.length ? sag.realtors[0] : null;
	const realtorAddress = realtor && realtor.contact.addressAssocs.find(a => a.isPrimary);
	const realtorPrimaryPhone = realtor && realtor.contact.phoneAssocs.find(a => a.isPrimary);
	const realtorSecondaryPhone = realtor && realtor.contact.phoneAssocs.find(a => !a.isPrimary);
	const realtorHomePhone = realtor && realtor.contact.phoneAssocs.find(a => a.phone.phoneType === PhoneType.Home);
	const realtorWorkPhone = realtor && realtor.contact.phoneAssocs.find(a => a.phone.phoneType === PhoneType.Business);
	const realtorMobilePhone = realtor && realtor.contact.phoneAssocs.find(a => a.phone.phoneType === PhoneType.Mobile);
	const realtorEmail = realtor && realtor.contact.emailAssocs.find(a => a.isPrimary);

	const currentDate = new Date();
	const communityCityStateZip = `${!isNullOrEmpty(financialCommunity.city) ? financialCommunity.city + ", " : ""}${!isNullOrEmpty(financialCommunity.state) ? financialCommunity.state + " " : ""}${isNull(financialCommunity.zip, "")}`;

	let map = new Map<string, string>();

	map.set("Primary Customer Last Name", isNull(primaryBuyer.lastName, ""));
	map.set("Primary Customer First Name", isNull(primaryBuyer.firstName, ""));
	map.set("Customer Prefix", isNull(primaryBuyer.prefix, ""));
	map.set("Customer Middle Name", isNull(primaryBuyer.middleName, ""));
	map.set("Customer Suffix", isNull(primaryBuyer.suffix, ""));
	map.set("Customer Address", customerAddress && customerAddress.address ? isNull(customerAddress.address.address1, "").trim() + " " + isNull(customerAddress.address.address2, "").trim() + "," : "");
	map.set("Customer City", customerAddress ? isNull(customerAddress.address.city, "") : "");
	map.set("Customer State", customerAddress ? isNull(customerAddress.address.stateProvince, "") : "");
	map.set("Customer Zip", customerAddress ? isNull(customerAddress.address.postalCode, "") : "");
	map.set("Home Phone", customerHomePhone ? isNull(formatPhoneNumber(customerHomePhone.phone.phoneNumber), "") : "");
	map.set("Work Phone", customerWorkPhone ? isNull(formatPhoneNumber(customerWorkPhone.phone.phoneNumber), "") : "");
	map.set("Mobile Phone", customerMobilePhone ? isNull(formatPhoneNumber(customerMobilePhone.phone.phoneNumber), "") : "");
	map.set("Fax", customerFax ? isNull(customerFax.phone.phoneNumber, "") : "");
	map.set("Email", customerEmail ? isNull(customerEmail.email.emailAddress, "") : "");
	map.set("Customer City State Zip", customerAddress ? `${isNull(customerAddress.address.city, "")}, ${isNull(customerAddress.address.stateProvince, "")} ${isNull(customerAddress.address.postalCode, "")}` : "");
	map.set("Customer Full Address", customerAddress ? `${isNull(primaryBuyer.firstName, "") + isNull(primaryBuyer.lastName, "")}<<break>>${map.get("Customer Address")}<<break>>${isNull(customerAddress.address.city, "")}, ${isNull(customerAddress.address.stateProvince, "")} ${isNull(customerAddress.address.postalCode, "")}` : "");
	map.set("Sales Associate", sag.consultants && sag.consultants.length ? sag.consultants[0].contact.firstName + " " + sag.consultants[0].contact.lastName : "");
	map.set("Spec Created By", jioCreatedBy);
	map.set("Build Type", buildType); 
	map.set("Sales Description", jioDescription);
	map.set("Community Number", financialCommunity.number);
	map.set("Community Name", financialCommunity.name);
	map.set("Community Marketing Name", financialCommunity.name);
	map.set("Community County", isNull(job.lot.county, ""));
	map.set("Community City", isNull(financialCommunity.city, ""));
	map.set("Community State", isNull(financialCommunity.state, ""));
	map.set("Community Zip", isNull(financialCommunity.zip, ""));
	// todo: get community address
	map.set("Community Address", "");
	map.set("Community City State Zip", communityCityStateZip.length ? communityCityStateZip : "");
	// todo: get community full address
	map.set("Community Full Address", "");
	map.set("Estimated COE", isNull(ecoeDateString, ""));
	map.set("Sales Agreement Status", sag.status);
	map.set("Sales Agreement Create Date", isNull(sagCreatedDate, ""));
	map.set("Sales Agreement Approve Date", isNull(sagApprovedDate, ""));
	map.set("Sales Agreement Signed Date", isNull(sagSignedDate, ""));
	map.set("Sales Agreement Cancel Date", !!sagCancelDate ? sagCancelDate.toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : "");
	// todo: get sales agreement cancel reason
	map.set("Sales Agreement Cancel Reason", isNull(sagCancelReason, ""));
	// todo: get sales agreement cancel detail
	map.set("Sales Agreement Cancel Detail", isNull(sagCancelDetail, ""));
	// todo: get construction estimated start date
	map.set("Estimated Start Date", isNull("", ""));
	map.set("Lot/Block Full Number", job.lot.lotBlock);
	map.set("Lot/Block First Two Numbers", job.lot.lotBlock.slice(0, 2));
	map.set("Lot/Block First Three Numbers", job.lot.lotBlock.slice(0, 3));
	map.set("Lot/Block Last Two Numbers", job.lot.lotBlock.slice(-2));
	map.set("Lot/Block Last Three Numbers", job.lot.lotBlock.slice(-3));
	map.set("Lot Address", isNull(job.lot.streetAddress1, "") + " " + isNull(job.lot.streetAddress2, ""));
	map.set("Lot City", isNull(job.lot.city, ""));
	map.set("Lot State", isNull(job.lot.stateProvince, ""));
	map.set("Lot Zip", isNull(job.lot.postalCode, ""));
	map.set("Lot City State Zip", job.lot.city ? `${isNull(job.lot.city, "")}, ${isNull(job.lot.stateProvince, "")} ${isNull(job.lot.postalCode, "")}` : "");
	map.set("Lot Full Address", `${isNull(primaryBuyer.firstName, "") + isNull(primaryBuyer.lastName, "")}<<break>>${map.get("Lot Address")}<<break>>${isNull(job.lot.city, "")}, ${isNull(job.lot.stateProvince, "")} ${isNull(job.lot.postalCode, "")}`);
	// todo: get lot release date
	map.set("Lot Release Date", "");
	map.set("Lot Type", !!job.lot.physicalLotTypes && job.lot.physicalLotTypes.length ? job.lot.physicalLotTypes.join(", ") : "");
	map.set("Plan ID", job.plan.masterPlanNumber)
	map.set("Plan Name", job.plan.planSalesName);
	map.set("Plan Description", isNull(job.plan.planSalesDescription, ""));
	map.set("Phase Name", !!job.lot.salesPhase && !!job.lot.salesPhase.salesPhaseName ? job.lot.salesPhase.salesPhaseName : "");
	// todo: get community tcg
	map.set("Community TCG", isNull("", ""));
	// todo: get municipality
	map.set("Municipality", isNull("", ""));
	// todo: get tract number
	map.set("Tract Number", isNull("", ""));
	// todo: get estimated construction start date - 2 month range
	map.set("Estimated Start Date - 2 Month Range", isNull("", ""));
	// todo: get estimated construction start date - 3 month range
	map.set("Estimated Start Date - 3 Month Range", isNull("", ""));
	map.set("Estimated COE - 2 Month Range",
		!!ecoeDate ? (ecoeDate.getDate() < 16 ?
			monthRange(addMonths(ecoeDate, -1), ecoeDate) :
			monthRange(ecoeDate, addMonths(ecoeDate, 1))) : "");
	map.set("Estimated COE - 3 Month Range", !!ecoeDate ? monthRange(addMonths(ecoeDate, -1), addMonths(ecoeDate, 1)) : "");
	map.set("Estimated COE Month", !!ecoeDate ? ecoeDate.toLocaleDateString('en-us', { month: 'long' }) : "");
	map.set("Estimated COE - 2 Month Range - Current Month And Next", !!ecoeDate ? monthRange(ecoeDate, addMonths(ecoeDate, 1)) : "");
	map.set("Estimated COE - 3 Month Range - Current Month + 2", !!ecoeDate ? monthRange(ecoeDate, addMonths(ecoeDate, 2)) : "");
	map.set("Square Feet", job.plan.squareFeet.toString());
	map.set("Plan TCG", isNull(job.plan.tcg, ""));
	map.set("Plan Foundation Type", isNull(job.plan.foundation, ""));
	map.set("Lot Foundation Type", isNull(job.lot.foundationType, ""));
	map.set("Sales Agreement Number", sag.salesAgreementNumber);
	map.set("Sales Program Name", !!salesProgram ? salesProgram.salesProgramDescription : "");
	map.set("Sales Program Name - Buyer Closing Cost", !!buyerClosingCost ? buyerClosingCost.salesProgramDescription : "");
	// "Sales Program Name - Loan Origination" not used in PHD
	map.set("Sales Program Name - Loan Origination", "");
	map.set("Deposit Description", sagDeposits.length ? sagDeposits.filter(d => !!d.paidDate).map(d => d.description).join(", ") : "");
	map.set("Elevation", !!elevationChoice ? elevationChoice.label : "");
	map.set("Handing", isNull(job.handing, ""));
	map.set("Co-Broker First Name", !!realtor ? realtor.contact.firstName : "");
	map.set("Agent First Name", !!realtor ? realtor.contact.firstName : "");
	map.set("Co-Broker Last Name", !!realtor ? realtor.contact.lastName : "");
	map.set("Agent Last Name", !!realtor ? realtor.contact.lastName : "");
	map.set("Co-Broker Address", !!realtorAddress ? isNull(realtorAddress.address.address1, "") + " " + isNull(realtorAddress.address.address2, "") : "");
	map.set("Co-Broker City", !!realtorAddress ? isNull(realtorAddress.address.city, "") : "");
	map.set("Broker City", !!realtorAddress ? isNull(realtorAddress.address.city, "") : "");
	map.set("Co-Broker State", !!realtorAddress ? isNull(realtorAddress.address.stateProvince, "") : "");
	map.set("Broker State", !!realtorAddress ? isNull(realtorAddress.address.stateProvince, "") : "");
	map.set("Co-Broker Zip", !!realtorAddress ? isNull(realtorAddress.address.postalCode, "") : "");
	map.set("Broker Zip", !!realtorAddress ? isNull(realtorAddress.address.postalCode, "") : "");
	map.set("Co-Broker Home Phone", !!realtorHomePhone ? isNull(realtorHomePhone.phone.phoneNumber, "") : "");
	map.set("Agent Primary Phone", !!realtorPrimaryPhone ? isNull(realtorPrimaryPhone.phone.phoneNumber, "") : "");
	map.set("Co-Broker Work Phone", !!realtorWorkPhone ? isNull(realtorWorkPhone.phone.phoneNumber, "") : "");
	map.set("Agent Secondary Phone", !!realtorSecondaryPhone ? isNull(realtorSecondaryPhone.phone.phoneNumber, "") : "");
	map.set("Co-Broker Mobile Phone", !!realtorMobilePhone ? isNull(realtorMobilePhone.phone.phoneNumber, "") : "");
	map.set("Co-Broker Email", !!realtorEmail ? isNull(realtorEmail.email.emailAddress, "") : "");
	map.set("Agent Primary Email", !!realtorEmail ? isNull(realtorEmail.email.emailAddress, "") : "");
	map.set("Co-Broker Company", !!realtor ? isNull(realtor.brokerName, "") : "");
	map.set("Broker Company", !!realtor ? isNull(realtor.brokerName, "") : "");
	map.set("Co-Broker Company City State Zip", !!realtorAddress ? `${isNull(realtorAddress.address.city, "")}, ${isNull(realtorAddress.address.stateProvince, "")} ${isNull(realtorAddress.address.postalCode, "")}` : "");
	map.set("Co-Broker Company Full Address", !!realtorAddress ? `${isNull(realtor.brokerName, "")}<<break>>${map.get("Co-Broker Address")}<<break>>${isNull(realtorAddress.address.city, "")}, ${isNull(realtorAddress.address.stateProvince, "")} ${isNull(realtorAddress.address.postalCode, "")}` : "");
	map.set("Broker Address", !!realtorAddress ? `${map.get("Co-Broker Address")}<<break>>${isNull(realtorAddress.address.city, "")}, ${isNull(realtorAddress.address.stateProvince, "")} ${isNull(realtorAddress.address.postalCode, "")}` : "");
	map.set("Current Date", currentDate.toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }));
	map.set("Current Day", currentDate.toLocaleDateString('en-US', { day: "2-digit" }));
	map.set("Current Month Number", currentDate.toLocaleDateString('en-US', { month: "2-digit" }));
	map.set("Current Month Name", currentDate.toLocaleDateString('en-us', { month: 'long' }));
	map.set("Current Year", currentDate.toLocaleDateString('en-US', { year: "numeric" }));
	map.set("Current Day of Week", currentDate.toLocaleDateString('en-us', { weekday: 'long' }));
	// todo: get agreement detail notes
	map.set("Agreement Detail Notes", "");
	// todo: get deposit notes
	map.set("Deposit Notes", "");
	// todo: get financing notes
	map.set("Financing Notes", "");
	// todo: get jio notes
	map.set("JIO Notes", "");
	map.set("Sales Agreement Notes", !!sag.notes && sag.notes.length ? sag.notes.filter(n => n.targetAudiences.find(x => x.name === "Public") && n.noteSubCategoryId !== 10).map(n => n.noteContent).join(", ") : "");
	map.set("Terms And Conditions", !!sag.notes && sag.notes.length ? sag.notes.filter(n => n.targetAudiences.find(x => x.name === "Public") && n.noteSubCategoryId === 10).map(n => n.noteContent).join() : "");
	// todo: get contract notes
	map.set("Contract Notes", "");
	// todo: get configuration notes
	map.set("Configuration Notes", "");
	// todo: get lot notes
	map.set("Lot Notes", "");
	// todo: get garage configuration
	map.set("Garage", handing);
	// todo: get signatures - customers and sales associate
	map.set("Signatures - Customers and Sales Associate", "");
	// todo: get signatures - customers without sales associate
	map.set("Signatures - Customers without Sales Associate", "");
	map.set("Customers", customerNames.join(", "));
	map.set("Customer List", customerNames.join("<<break>>"));
	// todo: get pulte mortgage product
	map.set("Pulte Mortgage Product", isNull("", ""));
	// todo: get loan term
	map.set("Loan Term", isNull("", ""));
	// todo: get property type
	map.set("Property Type", isNull(sag.propertyType, ""));
	// todo: get loan status
	map.set("Loan Status", isNull("", ""));
	// todo: get lender type
	map.set("Lender Type", isNull("", ""));
	// todo: get loan type
	map.set("Loan Type", isNull("", ""));
	// todo: get loan number 1
	map.set("Loan Number 1", isNull("", ""));
	// todo: get loan number 2
	map.set("Loan Number 2", isNull("", ""));
	// todo: get loan counselor
	map.set("Loan Counselor", isNull("", ""));
	// todo: get loan processor
	map.set("Loan Processor", isNull("", ""));
	map.set("Total House Price", price.totalPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Total Option Price", price.selections.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Total Selections Price", price.selections.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	// todo: get non-standard selections Price
	map.set("Non-Standard Selections Price", price.nonStandardSelections.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Lot Premium", price.homesite.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	// todo: get price adjustments
	map.set("Price Adjustments", price.priceAdjustments.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Sales Program Amount", price.salesProgram.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Sales Program Amount - Buyer Closing Cost", price.closingIncentive.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	// "Sales Program Amount - Loan Origination" not used in PHD
	map.set("Sales Program Amount - Loan Origination", "");
	map.set("Base House Price", price.baseHouse.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Elevation Price", (!!elevationChoice ? elevationChoice.price : 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	const totalEarnestMoneyDeposits = deposits_earnest.filter(d => !!d.dueDate).length ? deposits_earnest.filter(d => !!d.dueDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	const totalEarnestMoneyDepositsPaid = deposits_earnest.filter(d => !!d.paidDate).length ? deposits_earnest.filter(d => !!d.paidDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	const totalEarnestMoneyDepositsDue = deposits_earnest.filter(d => !!d.dueDate && !d.paidDate).length ? deposits_earnest.filter(d => !!d.dueDate && !d.paidDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	map.set("Total Earnest Money Deposits", totalEarnestMoneyDeposits.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Total Earnest Money Deposits Paid", totalEarnestMoneyDepositsPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Total Earnest Money Deposits Due", totalEarnestMoneyDepositsDue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	const totalOptionsDeposits = deposits_options.filter(d => !!d.dueDate).length ? deposits_options.filter(d => !!d.dueDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	const totalOptionsDepositsPaid = deposits_options.filter(d => !!d.paidDate).length ? deposits_options.filter(d => !!d.paidDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	const totalOptionsDepositsDue = deposits_options.filter(d => !!d.dueDate && !d.paidDate).length ? deposits_options.filter(d => !!d.dueDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	map.set("Total Options Deposits", totalOptionsDeposits.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Total Options Deposits Paid", totalOptionsDepositsPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Total Options Deposits Due", totalOptionsDepositsDue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	const totalDownPaymentDeposits = deposits_down.filter(d => !!d.dueDate).length ? deposits_down.filter(d => !!d.dueDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	const totalDownPaymentDepositsPaid = deposits_down.filter(d => !!d.paidDate).length ? deposits_down.filter(d => !!d.paidDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	const totalDownPaymentDepositsDue = deposits_down.filter(d => !!d.dueDate && !d.paidDate).length ? deposits_down.filter(d => !!d.dueDate && !d.paidDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	map.set("Total Down Payment Deposits", totalDownPaymentDeposits.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Total Down Payment Deposits Paid", totalDownPaymentDepositsPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Total Down Payment Deposits Due", totalDownPaymentDepositsDue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	const totalOtherDeposits = deposits_other.filter(d => !!d.dueDate).length ? deposits_other.filter(d => !!d.dueDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	const totalOtherDepositsPaid = deposits_other.filter(d => !!d.paidDate).length ? deposits_other.filter(d => !!d.paidDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	const totalOtherDepositsDue = deposits_other.filter(d => !!d.dueDate && !d.paidDate).length ? deposits_other.filter(d => !!d.dueDate && !d.paidDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	map.set("Total Other Deposits", totalOtherDeposits.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Total Other Deposits Paid", totalOtherDepositsPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Total Other Deposits Due", totalOtherDepositsDue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	const totalDeposits = sagDeposits.filter(d => !!d.dueDate).length ? sagDeposits.filter(d => !!d.dueDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	const totalDepositsPaid = sagDeposits.filter(d => !!d.paidDate).length ? sagDeposits.filter(d => !!d.paidDate).map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	const totalDepositsDue = sagDeposits.filter(d => !!d.dueDate && !d.paidDate).length ? sagDeposits.map(d => d.amount).reduce((prv, nxt) => prv + nxt) : 0;
	map.set("Total Deposits", totalDeposits.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Total Deposits Paid", totalDepositsPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Total Deposits Due", totalDepositsDue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
	map.set("Itemized Earnest Money Deposits", deposits_earnest_itemized);
	map.set("Itemized Options Deposits", deposits_options_itemized);
	map.set("Itemized Down Payment Deposits", deposits_down_itemized);
	map.set("Itemized Other Deposits", deposits_other_itemized);
	map.set("Itemized Deposits", deposits_itemized);
	map.set("Next Earnest Money Amount", deposit_next_due_earnest.length ? deposit_next_due_earnest[0].amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : "");
	map.set("Next Earnest Money Due", deposit_next_due_earnest.length && !!deposit_next_due_earnest[0].dueDate ? (new Date(deposit_next_due_earnest[0].dueDate)).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : "");
	map.set("Next Deposit Amount", deposit_next_due.length ? deposit_next_due[0].amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : "");
	map.set("Next Deposit Due", deposit_next_due.length && !!deposit_next_due[0].dueDate ? (new Date(deposit_next_due[0].dueDate)).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : "");
	map.set("Current Deposit Paid", deposit_current_paid.length && !!deposit_current_paid[0].paidDate ? (new Date(deposit_current_paid[0].paidDate)).toLocaleDateString('en-US', { month: "2-digit", day: "2-digit", year: "numeric" }) : "");
	// todo: get cash at closing minus earnest money
	map.set("Cash at Closing Minus Earnest Money", "");
	// todo: get balance due
	map.set("Balance Due", "");
	// todo: get cash at closing minus down payments
	map.set("Cash at Closing Minus Down Payments", "");
	// todo: get cash at closing minus earnest money and down payments
	map.set("Cash at Closing Minus Earnest Money and Down Payments", "");
	// todo: get itemized closing costs
	map.set("Itemized Closing Costs", "");
	// todo: get itemized prepaids
	map.set("Itemized Prepaids", "");
	// todo: get total closing costs
	map.set("Total Closing Costs", "");
	// todo: get total prepais
	map.set("Total Prepaids", "");
	// todo: get financed amount
	map.set("Financed Amount", "");
	// todo: get mortgage insurance
	map.set("Mortgage Insurance", "");
	// todo: get property taxes
	map.set("Property Taxes", "");
	// todo: get home owners insurance
	map.set("Home Owners Insurance", "");
	// todo: get principle and interest
	map.set("Principle and Interest", "");
	// todo: get total estimated lender's monthly payment
	map.set("Total Estimated Lender's Monthly Payment", "");
	// todo: get lot transfer community
	map.set("Lot Transfer Community", "");
	// todo: get lot transfer lot/block full number
	map.set("Lot Transfer Lot/Block Full Number", "");
	map.set("Alternate Lot/Block", isNull(job.lot.alternateLotBlock, ""));
	map.set("Building Number", isNull(job.lot.salesBldgNbr, ""));
	map.set("Unit Number", isNull(job.lot.unitNumber, ""));
	// todo: get jio or spec customer change order number
	map.set("JIO or Spec Customer Change Order Number", isNull("", ""));
	map.set("Primary Buyer Name", isNull(sag.trustName, `${primaryBuyer.firstName ? primaryBuyer.firstName : ''}${primaryBuyer.middleName ? ' ' + primaryBuyer.middleName : ''} ${primaryBuyer.lastName ? ' ' + primaryBuyer.lastName : ''}${primaryBuyer.suffix ? ' ' + primaryBuyer.suffix : ''}`));

	let coBuyerNames = [];

	for (let i = 0; i < coBuyers.length; i++)
	{
		const b = coBuyers[i].opportunityContactAssoc.contact;
		const coBuyerName = `${b.firstName}${b.middleName ? ' ' + b.middleName : ''} ${b.lastName}${b.suffix ? ' ' + b.suffix : ''}`;

		coBuyerNames[i] = coBuyerName;
		map.set(`Co-Buyer ${i + 1} Name`, coBuyerName);
	}

	for (let i = coBuyers.length; i <= 5; i++)
	{
		map.set(`Co-Buyer ${i + 1} Name`, "");
	}

	map.set("Co Buyers", coBuyerNames.join(", "));

	let datePlus3 = new Date();
	datePlus3.setDate(datePlus3.getDate() + 3);
	let datePlus5 = new Date();
	datePlus5.setDate(datePlus5.getDate() + 5);
	let datePlus14 = new Date();
	datePlus14.setDate(datePlus14.getDate() + 14);
	let datePlus21 = new Date();
	datePlus21.setDate(datePlus21.getDate() + 21);
	let datePlus30 = new Date();
	datePlus30.setDate(datePlus30.getDate() + 30);
	let datePlus60 = new Date();
	datePlus60.setDate(datePlus60.getDate() + 60);

	map.set("Current Date + 3 Days", datePlus3.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }));
	map.set("Current Date + 5 Days", datePlus5.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }));
	map.set("Current Date + 14 Days", datePlus14.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }));
	map.set("Current Date + 21 Days", datePlus21.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }));
	map.set("Current Date + 30 Days", datePlus30.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }));
	map.set("Current Date + 60 Days", datePlus60.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }));

	// get contingency expiration date
	let contingencyExpirationDate: Date = null;
	if (sag.contingencies && sag.contingencies.length) {
		const expiresFirst = sag.contingencies.sort((a, b) => a.expirationDate < b.expirationDate ? -1 : (a.expirationDate > b.expirationDate ? 1 : 0))[0];
		contingencyExpirationDate = new Date(expiresFirst.expirationDate);
	}
	map.set("Contingency Expiration Date", (contingencyExpirationDate ? contingencyExpirationDate.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : ""));

	return map;
}
