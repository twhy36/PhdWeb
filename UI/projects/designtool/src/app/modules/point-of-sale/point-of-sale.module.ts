import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { NgbModule, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { AutoCompleteModule } from 'primeng/autocomplete';

import { SharedModule } from '../shared/shared.module';
import { PhdCommonModule } from 'phd-common';

import { AgreementComponent } from './components/agreement/agreement.component';
import { AgreementDocumentsComponent } from './components/agreement-documents/agreement-documents.component';
import { BuyerInfoDetailComponent } from './components/buyer-info-detail/buyer-info-detail.component';
import { CancelAgreementComponent } from './components/cancel-agreement/cancel-agreement.component';
import { ConfirmNavigationGuard } from '../core/guards/confirm-navigation.guard';
import { ContingencyDetailComponent } from './components/contingency-detail/contingency-detail.component';
import { DepositDetailComponent } from './components/deposit-detail/deposit-detail.component';
import { KeyChoicesComponent } from './components/key-choices/key-choices.component';
import { MatchingContactsComponent } from './components/matching-contacts/matching-contacts.component';
import { MatchingContactCardComponent } from './components/matching-contact-card/matching-contact-card.component';
import { ContactItemComponent } from './components/contact-item/contact-item.component';
import { PeopleCardAddressComponent } from './components/people-card-address/people-card-address.component';
import { PeopleCardComponent } from './components/people-card/people-card.component';
import { PeopleComponent } from './components/people/people.component';
import { PointOfSaleComponent } from './components/point-of-sale/point-of-sale.component';
import { PosHeaderComponent } from './components/pos-header/pos-header.component';
import { PosProgressBarComponent } from './components/pos-progress-bar/pos-progress-bar.component';
import { PriceAdjustmentDetailComponent } from './components/price-adjustment-detail/price-adjustment-detail.component'
import { ProgramDetailComponent } from './components/program-detail/program-detail.component';
import { SalesInfoComponent } from './components/sales-info/sales-info.component';
import { SalesInfoMiscComponent } from './components/sales-info-misc/sales-info-misc.component';
import { SalesNoteComponent } from './components/sales-note/sales-note.component';
import { SignAgreementComponent } from './components/sign-agreement/sign-agreement.component';
import { SalesConsultantComponent } from './components/sales-consultant/sales-consultant.component';
import { VoidAgreementComponent } from './components/void-agreement/void-agreement.component';

const moduleRoutes: Routes = [
	{
		path: 'point-of-sale',
		component: PointOfSaleComponent,
		canActivate: [],
		data: {},
		children: [
			{ path: '', redirectTo: 'people', pathMatch: 'full' },
			{
				path: 'people/:salesAgreementId',
				component: PeopleComponent,
				canDeactivate: [ConfirmNavigationGuard]
			},
			{
				path: 'people',
				component: PeopleComponent,
				canDeactivate: [ConfirmNavigationGuard]
			},
			{
				path: 'sales-info/:salesAgreementId',
				component: SalesInfoComponent,
				canDeactivate: [ConfirmNavigationGuard]
			},
			{
				path: 'sales-info',
				component: SalesInfoComponent,
				canDeactivate: [ConfirmNavigationGuard]
			},
			{
				path: 'agreement',
				component: AgreementComponent
			},
			{
				path: 'agreement/:salesAgreementId',
				component: AgreementComponent
			}
		]
	}
];

@NgModule({
	imports: [
		CommonModule,
		FormsModule,
		NgbModule,
		NgbDatepickerModule,
		ReactiveFormsModule,
		RouterModule.forChild(moduleRoutes),
		SharedModule,
		PhdCommonModule,
		AutoCompleteModule
	],
	declarations: [
		AgreementComponent,
		AgreementDocumentsComponent,
		BuyerInfoDetailComponent,
		CancelAgreementComponent,
		ContingencyDetailComponent,
		DepositDetailComponent,
		KeyChoicesComponent,
		MatchingContactsComponent,
		MatchingContactCardComponent,
		ContactItemComponent,
		PeopleCardAddressComponent,
		PeopleCardComponent,
		PeopleComponent,
		PointOfSaleComponent,
		PosHeaderComponent,
		PosProgressBarComponent,
		PriceAdjustmentDetailComponent,
		ProgramDetailComponent,
		SalesInfoComponent,
		SalesInfoMiscComponent,
		SalesNoteComponent,
		SignAgreementComponent,
		SalesConsultantComponent,
		VoidAgreementComponent
	]
})
export class PointOfSaleModule { }
