import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { ToastModule } from 'primeng/toast';

import { TableModule } from 'primeng/table';
import { MultiSelectModule } from 'primeng/multiselect';
import { DropdownModule } from 'primeng/dropdown';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { TabViewModule } from 'primeng/tabview';
import { CheckboxModule } from 'primeng/checkbox';

import { PhdCommonModule } from 'phd-common';

import { ActionButtonsComponent } from './components/action-buttons/action-buttons.component';
import { ActionButtonsItemComponent } from './components/action-buttons-item/action-buttons-item.component';
import { AttributeGroupActionPanelComponent } from './components/attribute-group-action-panel/attribute-group-action-panel.component';
import { SidePanelComponent } from './components/side-panel/side-panel.component';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { ChoiceSelectorComponent } from './components/choice-selector/choice-selector.component';
import { ImageSearchComponent } from './components/image-search/image-search.component';
import { ImageCardComponent } from './components/image-card/image-card.component';
import { WizardTemplateComponent } from './components/wizard-template/wizard-template.component';
import { TreeToggleComponent } from './components/tree-toggle/tree-toggle.component';

import { PhdTabPanelDirective } from './components/tab-view/tab-panel.directive';
import { PhdTabViewComponent } from './components/tab-view/tab-view.component';

@NgModule({
    exports: [
        ActionButtonsComponent,
		ActionButtonsItemComponent,
		AttributeGroupActionPanelComponent,
        SidePanelComponent,
        PageHeaderComponent,
		SearchBarComponent,
		SearchResultsComponent,
		ChoiceSelectorComponent,
		PhdTabViewComponent,
		PhdTabPanelDirective,
		ImageSearchComponent,
		ImageCardComponent,
		WizardTemplateComponent,
		TreeToggleComponent
    ],
    declarations: [
        ActionButtonsComponent,
		ActionButtonsItemComponent,
		AttributeGroupActionPanelComponent,
        SidePanelComponent,
        PageHeaderComponent,
		SearchBarComponent,
		SearchResultsComponent,
		ChoiceSelectorComponent,
		PhdTabPanelDirective,
		PhdTabViewComponent,
		ImageSearchComponent,
		ImageCardComponent,
		WizardTemplateComponent,
		TreeToggleComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
		RouterModule,
        TableModule,
        MultiSelectModule,
        DropdownModule,
		OverlayPanelModule,
        NgbModule,
		TabViewModule,
		ToastModule,
		CheckboxModule,
		PhdCommonModule
    ],
    providers: [
    ]
})
export class SharedModule { }
