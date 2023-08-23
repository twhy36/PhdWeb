import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CloudinaryModule } from '@cloudinary/ng';
import { CarouselModule } from 'primeng/carousel';
import { NgbModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { PhdCommonModule } from 'phd-common';

import { ActionBarComponent } from './components/action-bar/action-bar.component';
import { FloorPlanComponent } from './components/floor-plan/floor-plan.component';
import { TreeFilterComponent } from './components/tree-filter/tree-filter.component';
import { GroupBarComponent } from './components/group-bar/group-bar.component';
import { HeaderBarComponent } from './components/header-bar/header-bar.component';
import { DecisionBarComponent } from './components/decision-bar/decision-bar.component';
import { IncludedDecisionBarComponent } from './components/included-decision-bar/included-decision-bar.component';
import { ChoiceCardComponent } from './components/choice-card/choice-card.component';
import { ChoiceCardDetailComponent } from './components/choice-card-detail/choice-card-detail.component';
import { ChoiceDeclineCardComponent } from './components/choice-decline-card/choice-decline-card.component';
import { DecisionPointSummaryComponent } from './components/decision-point-summary/decision-point-summary.component';
import { AttributeGroupComponent } from './components/attribute-group/attribute-group.component';
import { AttributeListComponent } from './components/attribute-list/attribute-list.component';
import { AttributeLocationComponent } from './components/attribute-location/attribute-location.component';
import { QuantityInputComponent } from './components/quantity-input/quantity-input.component';
import { DetailedDecisionBarComponent } from './components/detailed-decision-bar/detailed-decision-bar.component';
import { DecisionBarChoiceComponent } from './components/detailed-decision-bar/decision-bar-choice/decision-bar-choice.component';
import { DecisionBarDeclineChoiceComponent } from './components/detailed-decision-bar/decision-bar-decline-choice/decision-bar-decline-choice.component';
import { BlockedChoiceModalComponent } from './components/blocked-choice-modal/blocked-choice-modal.component';
import { InfoModalComponent } from './components/info-modal/info-modal.component';
import { InfoTooltipComponent } from './components/info-tooltip/info-tooltip.component';
import { FooterBarComponent } from './components/footer-bar/footer-bar.component';
import { ChoiceIdToNamePipe } from './pipes/choiceIdToName.pipe';
import { PointIdToNamePipe } from './pipes/pointIdToName.pipe';
import { ChoicePriceWithRangeCheckPipe } from './pipes/choicePriceWithRangeCheck.pipe';

@NgModule({
	exports: [
	ActionBarComponent,
	FloorPlanComponent,
	TreeFilterComponent,
	GroupBarComponent,
	HeaderBarComponent,
	DecisionBarComponent,
	ChoiceCardComponent,
	ChoiceDeclineCardComponent,
	ChoiceCardDetailComponent,
	DecisionPointSummaryComponent,
	AttributeGroupComponent,
	AttributeListComponent,
	AttributeLocationComponent,
	QuantityInputComponent,
	DetailedDecisionBarComponent,
	IncludedDecisionBarComponent,
	FooterBarComponent,
	ChoiceIdToNamePipe,
	PointIdToNamePipe,
	ChoicePriceWithRangeCheckPipe
	],
	declarations: [
	ActionBarComponent,
	FloorPlanComponent,
	TreeFilterComponent,
	GroupBarComponent,
	HeaderBarComponent,
	DecisionBarComponent,
	ChoiceCardComponent,
	ChoiceDeclineCardComponent,
	ChoiceCardDetailComponent,
	DecisionPointSummaryComponent,
	AttributeGroupComponent,
	AttributeListComponent,
	AttributeLocationComponent,
	QuantityInputComponent,
	DetailedDecisionBarComponent,
	IncludedDecisionBarComponent,
	DecisionBarChoiceComponent,
	DecisionBarDeclineChoiceComponent,
	BlockedChoiceModalComponent,
	InfoModalComponent,
	InfoTooltipComponent,
	FooterBarComponent,
	ChoiceIdToNamePipe,
	PointIdToNamePipe,
	ChoicePriceWithRangeCheckPipe
	],
	imports: [
	BrowserModule,
	BrowserAnimationsModule,
	CommonModule,
	FormsModule,
	ReactiveFormsModule,
	CloudinaryModule,
	CarouselModule,
	NgbModule,
	NgbTooltipModule,
	MatMenuModule,
	MatButtonModule,
	PhdCommonModule
	],
	providers: []
	})
export class SharedModule { }
