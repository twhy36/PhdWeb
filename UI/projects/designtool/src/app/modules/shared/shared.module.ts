import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { CloudinaryModule } from '@cloudinary/angular-5.x';
import { DragScrollModule } from 'ngx-drag-scroll';
import { CarouselModule } from 'primeng/carousel';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { PhdCommonModule } from 'phd-common';

import { ActionBarComponent } from './components/action-bar/action-bar.component';
import { AddCardComponent } from './components/add-card/add-card.component';
import { AttributeGroupComponent } from './components/attribute-group/attribute-group.component';
import { AttributeListComponent } from './components/attribute-list/attribute-list.component';
import { AttributeLocationComponent } from './components/attribute-location/attribute-location.component';
import { ChangeOrderNoteComponent } from './components/change-order-note/change-order-note.component';
import { ChoiceCardComponent } from './components/choice-card/choice-card.component';
import { ChoiceCardDetailComponent } from './components/choice-card-detail/choice-card-detail.component';
import { DecisionBarComponent } from './components/decision-bar/decision-bar.component';
import { DecisionPointFilterComponent } from './components/decision-point-filter/decision-point-filter.component';
import { DecisionPointSummaryComponent } from './components/decision-point-summary/decision-point-summary.component';
import { DistributionListComponent } from './components/distribution-list/distribution-list.component';
import { DisabledErrorComponent } from './components/disabled-error/disabled-error.component';
import { ExperienceFilterComponent } from './components/experience-filter/experience-filter.component';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { PDFViewerComponent } from './components/pdf-viewer/pdf-viewer.component';
import { PhaseProgressBarComponent } from './components/phase-progress-bar/phase-progress-bar.component';
import { PriceInputComponent } from './components/price-input/price-input.component';
import { QuantityInputComponent } from './components/quantity-input/quantity-input.component';
import { SaveCancelButtonsComponent } from './components/save-cancel-buttons/save-cancel-buttons.component';
import { ScenarioStatusComponent } from './components/scenario-status/scenario-status.component';
import { StatusIndicatorComponent } from './components/status-indicator/status-indicator.component';
import { TreeFilterComponent } from './components/tree-filter/tree-filter.component';
import { PlanComponent } from './components/plan/plan.component';
import { PlanCardComponent } from './components/plan-card/plan-card.component';

import { CapitalCaseSpacePipe } from './pipes/capitalCaseSpace.pipe';
import { ChoiceIdToNamePipe } from './pipes/choiceIdToName.pipe';
import { ChoiceSelectionsPipe } from './pipes/choiceSelections.pipe';
import { CityStateZipPipe } from './pipes/city-state-zip.pipe';
import { ContactAddressPipe } from './pipes/contact-address.pipe';
import { ContactPrimaryEmailPipe } from './pipes/contact-primary-email.pipe';
import { ContactPrimaryPhonePipe } from './pipes/contact-primary-phone.pipe';
import { EnumToArrayPipe } from './pipes/enum-to-array.pipe';
import { MapJoinPipe } from './pipes/map-join.pipe';
import { PointIdToNamePipe } from './pipes/pointIdToName.pipe';
import { SafeUrlPipe } from './pipes/safe-url.pipe';
import { ContactFullNamePipe } from './pipes/contact-full-name.pipe';
import { MinusSignToParens } from './pipes/minusSignToParens.pipe';
import { PriceRangePipe } from './pipes/priceRange.pipe';

import { PhoneNumberDirective } from './directives';
import { InputFilterDirective } from './directives/input-filter.directive';

@NgModule({
    exports: [
        AttributeListComponent,
        ChoiceCardComponent,
		ChoiceCardDetailComponent,
		ChoiceIdToNamePipe,
        DecisionBarComponent,
        DecisionPointFilterComponent,
		ContactAddressPipe,
		ActionBarComponent,
		AddCardComponent,
		AttributeGroupComponent,
		AttributeLocationComponent,
		CapitalCaseSpacePipe,
		ChangeOrderNoteComponent,
		ChoiceSelectionsPipe,
		CityStateZipPipe,
		ContactPrimaryEmailPipe,
		ContactPrimaryPhonePipe,
		DecisionPointSummaryComponent,
		DisabledErrorComponent,
		EnumToArrayPipe,
		ExperienceFilterComponent,
		MapJoinPipe,
		PageHeaderComponent,
		PageNotFoundComponent,
		PDFViewerComponent,
		PhaseProgressBarComponent,
		PhoneNumberDirective,
		PointIdToNamePipe,
		PriceInputComponent,
		SafeUrlPipe,
		SaveCancelButtonsComponent,
		ScenarioStatusComponent,
		StatusIndicatorComponent,
		TreeFilterComponent,
		PlanComponent,
		PlanCardComponent,
		InputFilterDirective,
		DistributionListComponent,
		ContactFullNamePipe,
		MinusSignToParens,
		PriceRangePipe
    ],
    declarations: [
        AttributeListComponent,
        ChoiceCardComponent,
		ChoiceCardDetailComponent,
		ChoiceIdToNamePipe,
        DecisionBarComponent,
        DecisionPointFilterComponent,
        QuantityInputComponent,
	    ContactAddressPipe,
		ActionBarComponent,
		AddCardComponent,
		AttributeGroupComponent,
		AttributeLocationComponent,
		CapitalCaseSpacePipe,
		ChangeOrderNoteComponent,
		ChoiceSelectionsPipe,
		CityStateZipPipe,
		ContactPrimaryEmailPipe,
		ContactPrimaryPhonePipe,
		DecisionPointSummaryComponent,
		DisabledErrorComponent,
		EnumToArrayPipe,
		ExperienceFilterComponent,
		MapJoinPipe,
		PageHeaderComponent,
		PageNotFoundComponent,
		PDFViewerComponent,
		PhaseProgressBarComponent,
		PhoneNumberDirective,
		PointIdToNamePipe,
		PriceInputComponent,
		SafeUrlPipe,
		SaveCancelButtonsComponent,
		ScenarioStatusComponent,
		StatusIndicatorComponent,
		TreeFilterComponent,
		PlanComponent,
		PlanCardComponent,
		InputFilterDirective,
		DistributionListComponent,
		ContactFullNamePipe,
		MinusSignToParens,
		PriceRangePipe
    ],
    imports: [
        BrowserAnimationsModule,
        CommonModule,
        HttpClientModule,
        RouterModule,
	    ReactiveFormsModule,
		CloudinaryModule,
		DragScrollModule,
		CarouselModule,
		FormsModule,
		NgbModule,
		PhdCommonModule
    ],
	providers: []
})
export class SharedModule { }
