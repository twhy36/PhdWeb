import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';

import { PhdCommonModule } from 'phd-common';
import { SharedModule } from '../shared/shared.module';

import { CalendarModule } from 'primeng/calendar';
import { ToastModule } from 'primeng/toast';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { ManageTreeComponent } from './components/manage-tree/manage-tree.component';
import { ManageTreeOptionsComponent } from './components/manage-tree-options/manage-tree-options.component';

import {
	AddItemSidePanelComponent,
	ChoiceSidePanelComponent,
	OptionRuleComponent,
	AssociateAttributeGroupComponent,
	AssociateLocationGroupComponent,
	PointSidePanelComponent,
	RuleComponent,
	TreeSidePanelComponent,
	TreeTableComponent,
	NewTreeComponent
} from './components/manage-tree';

import {
	OptionChoiceRuleComponent,
	OptionImagesPanelComponent,
	OptionSidePanelComponent,
	ReplaceOptionRuleComponent,
	OptionAttributesPanelComponent,
	TreeOptionsContainerComponent,
	OptionLocationComponent
} from './components/manage-tree-options';

import { CommunityComponent } from './components/community/community.component';
import { CopyTreeComponent } from './components/copy-tree/copy-tree.component';
import { MessageBarComponent } from './components/message-bar/message-bar.component';
import { MessagesSidePanelComponent } from './components/messages-side-panel/messages-side-panel.component';

import { CanDeactivateGuard } from '../core/guards/can-deactivate.guard';
import { ChoiceImagesPanelComponent } from './components/manage-tree/choice-images-panel/choice-images-panel.component';

const moduleRoutes: Routes = [
	{
		path: 'community',
		component: CommunityComponent,
		canActivate: [],
		data: {},
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'tree' },
			{ path: 'copy-tree', component: CopyTreeComponent },
			{ path: 'tree', component: ManageTreeComponent, canDeactivate: [CanDeactivateGuard] },
			{ path: 'tree/:treeVersionId', component: ManageTreeComponent, canDeactivate: [CanDeactivateGuard] },
			{ path: 'tree-options/:treeVersionId', component: ManageTreeOptionsComponent, canDeactivate: [CanDeactivateGuard] }
		]
	}
];

@NgModule({
	declarations: [
		AddItemSidePanelComponent,
		ChoiceSidePanelComponent,
		CommunityComponent,
		CopyTreeComponent,
		MessageBarComponent,
		MessagesSidePanelComponent,
		ManageTreeComponent,
		ManageTreeOptionsComponent,
		OptionChoiceRuleComponent,
		OptionImagesPanelComponent,
		ChoiceImagesPanelComponent,
		OptionLocationComponent,
		OptionRuleComponent,
		OptionAttributesPanelComponent,
		OptionSidePanelComponent,
		PointSidePanelComponent,
		ReplaceOptionRuleComponent,
		RuleComponent,
		TreeOptionsContainerComponent,
		TreeSidePanelComponent,
		TreeTableComponent,
		AssociateAttributeGroupComponent,
		AssociateLocationGroupComponent,
		NewTreeComponent
	],
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		SharedModule,
		CalendarModule,
		ToastModule,
		NgbModule,
		MessagesModule,
		MessageModule,
		PhdCommonModule,
		RouterModule.forChild(moduleRoutes)
	],
	providers: []
})
export class CommunityModule
{

}
