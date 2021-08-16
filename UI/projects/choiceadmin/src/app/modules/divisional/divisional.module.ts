import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { CloudinaryModule } from '@cloudinary/angular-5.x';

import { ToastModule } from 'primeng/toast';
import { SharedModule } from '../shared/shared.module';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { TabViewModule } from 'primeng/tabview';
import { MessagesModule } from 'primeng/messages';
import { DropdownModule } from 'primeng/dropdown';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import * as ngxInfiniteScroll from 'ngx-infinite-scroll';

import { PhdCommonModule } from 'phd-common';

import { DivisionalComponent } from './components/divisional/divisional.component';
import { DivisionalCatalogComponent } from './components/divisional-catalog/divisional-catalog.component';
import { DivisionalCatalogWizardComponent } from './components/divisional-catalog-wizard/divisional-catalog-wizard.component';
import { DivisionalAttributesComponent } from './components/divisional-attributes/divisional-attributes/divisional-attributes.component';
import { DivisionalAttributeTemplateComponent } from './components/divisional-attributes/divisional-attribute-template/divisional-attribute-template.component';
import { DivisionalAttributeActionsComponent } from './components/divisional-attributes/divisional-attribute-actions/divisional-attribute-actions.component';
import { DivisionalCatalogReactivateComponent } from './components/divisional-catalog/divisional-catalog-reactivate/divisional-catalog-reactivate.component';
import { ChoiceSidePanelComponent } from './components/divisional-catalog/choice-side-panel/choice-side-panel.component';
import { PointSidePanelComponent } from './components/divisional-catalog/point-side-panel/point-side-panel.component';
import { PointTypeComponent } from './components/divisional-catalog/point-type/point-type.component';

import { DivChoicesContainerComponent } from './components/divisional-attributes/divisional-choices/div-choices-container/div-choices-container.component';
import { DivChoicesPanelComponent } from './components/divisional-attributes/divisional-choices/div-choices-panel/div-choices-panel.component';
import { ExpansionChoiceAttributeGroupsTabPanelComponent } from './components/divisional-attributes/divisional-choices/expansion-attribute-groups-tab-panel/expansion-attribute-groups-tab-panel.component';
import { ExpansionChoiceCommunitiesTabPanelComponent } from './components/divisional-attributes/divisional-choices/expansion-communities-tab-panel/expansion-communities-tab-panel.component';
import { ExpansionChoiceImagesTabPanelComponent } from './components/divisional-attributes/divisional-choices/expansion-images-tab-panel/expansion-images-tab-panel.component';
import { ExpansionChoiceLocationGroupsTabPanelComponent } from './components/divisional-attributes/divisional-choices/expansion-location-groups-tab-panel/expansion-location-groups-tab-panel.component';

import { DivisionalOptionsContainerComponent } from './components/divisional-attributes/divisional-options/divisional-options-container/divisional-options-container.component';
import { DivisionalOptionsPanelComponent } from './components/divisional-attributes/divisional-options/divisional-options-panel/divisional-options-panel.component';
import { DivOptionsAttributeGroupsSidePanelComponent } from './components/divisional-attributes/divisional-options/div-options-attribute-groups-side-panel/div-options-attribute-groups-side-panel.component';
import { DivOptionsLocationGroupsSidePanelComponent } from './components/divisional-attributes/divisional-options/div-options-location-groups-side-panel/div-options-location-groups-side-panel.component';
import { ExpansionAttributeGroupsTabPanelComponent } from './components/divisional-attributes/divisional-options/expansion-attribute-groups-tab-panel/expansion-attribute-groups-tab-panel.component';
import { ExpansionLocationGroupsTabPanelComponent } from './components/divisional-attributes/divisional-options/expansion-location-groups-tab-panel/expansion-location-groups-tab-panel.component';
import { ExpansionAssociateCommunitiesTabPanelComponent } from './components/divisional-attributes/divisional-options/expansion-associate-communities-tab-panel/expansion-associate-communities-tab-panel.component';
import { ExpansionAssociateGroupsTabPanelComponent } from './components/divisional-attributes/divisional-options/expansion-associate-groups-tab-panel/expansion-associate-groups-tab-panel.component';
import { AssociateCommunitiesSidePanelComponent } from './components/divisional-attributes/shared/components/associate-communities-side-panel/associate-communities-side-panel.component';

import { AttributesContainerComponent } from './components/divisional-attributes/attributes/attributes-container/attributes-container.component';
import { AttributesPanelComponent } from './components/divisional-attributes/attributes/attributes-panel/attributes-panel.component';
import { AttributesSidePanelComponent } from './components/divisional-attributes/attributes/attributes-side-panel/attributes-side-panel.component';
import { AttributeDetailsTabComponent } from './components/divisional-attributes/attributes/attribute-details-tab/attribute-details-tab.component';
import { AttributeGroupsTabComponent } from './components/divisional-attributes/attributes/attribute-groups-tab/attribute-groups-tab.component';

import { AttributeGroupsContainerComponent } from './components/divisional-attributes/attribute-groups/attribute-groups-container/attribute-groups-container.component';
import { AttributeGroupsPanelComponent } from './components/divisional-attributes/attribute-groups/attribute-groups-panel/attribute-groups-panel.component';
import { AttributeGroupsSidePanelComponent } from './components/divisional-attributes/attribute-groups/attribute-groups-side-panel/attribute-groups-side-panel.component';
import { AssociateAttributesSidePanelComponent } from './components/divisional-attributes/attribute-groups/associate-attributes-side-panel/associate-attributes-side-panel.component';
import { ExpansionAttributesTabPanelComponent } from './components/divisional-attributes/attribute-groups/expansion-attributes-tab-panel/expansion-attributes-tab-panel.component';

import { LocationsContainerComponent } from './components/divisional-attributes/locations/locations-container/locations-container.component';
import { LocationsPanelComponent } from './components/divisional-attributes/locations/locations-panel/locations-panel.component';
import { LocationsSidePanelComponent } from './components/divisional-attributes/locations/locations-side-panel/locations-side-panel.component';
import { ExpansionAssociatedLocationGroupTabPanelComponent } from './components/divisional-attributes/locations/expansion-associated-loc-group-tab-panel/expansion-associated-loc-group-tab-panel.component';
import { LocationsDetailsTabComponent } from './components/divisional-attributes/locations/locations-details-tab/locations-details-tab.component';
import { LocationsGroupsTabComponent } from './components/divisional-attributes/locations/locations-groups-tab/locations-groups-tab.component';

import { LocationGroupsContainerComponent } from './components/divisional-attributes/location-groups/location-groups-container/location-groups-container.component';
import { LocationGroupsPanelComponent } from './components/divisional-attributes/location-groups/location-groups-panel/location-groups-panel.component';
import { LocationGroupsSidePanelComponent } from './components/divisional-attributes/location-groups/location-groups-side-panel/location-groups-side-panel.component';
import { AssociateLocationsSidePanelComponent } from './components/divisional-attributes/location-groups/associate-locations-side-panel/associate-locations-side-panel.component';
import { ExpansionLocationsTabPanelComponent } from './components/divisional-attributes/location-groups/expansion-locations-tab-panel/expansion-locations-tab-panel.component';

import { ExpansionTabPanelComponent } from './components/divisional-attributes/shared/components/expansion-tab-panel/expansion-tab-panel.component';
import { StatusBarComponent } from './components/divisional-attributes/shared/components/status-bar/status-bar.component';

import { GroupCommunitiesPipe } from './components/divisional-attributes/shared/pipes/div-group-communities/div-group-communities.pipe';
import { GroupOptionsPipe } from './components/divisional-attributes/shared/pipes/div-group-options/div-group-options.pipe';
import { GroupChoicesPipe } from './components/divisional-attributes/shared/pipes/div-group-choices/div-group-choices.pipe';
import { DivisionalAttributeWizardComponent } from './components/divisional-attributes/divisional-attribute-wizard/divisional-attribute-wizard.component';
import { DivisionalCatalogWizardStep1Component } from './components/divisional-catalog-wizard/step-1/divisional-catalog-wizard-step1.component';
import { DivisionalCatalogWizardStep2Component } from './components/divisional-catalog-wizard/step-2/divisional-catalog-wizard-step2.component';
import { DivisionalCatalogWizardStep3Component } from './components/divisional-catalog-wizard/step-3/divisional-catalog-wizard-step3.component';
import { DivisionalCatalogWizardStep4Component } from './components/divisional-catalog-wizard/step-4/divisional-catalog-wizard-step4.component';
import { DivisionalAttributeWizardStep1Component } from './components/divisional-attributes/divisional-attribute-wizard/step-1/divisional-attribute-wizard-step1.component';
import { DivisionalAttributeWizardStep2Component } from './components/divisional-attributes/divisional-attribute-wizard/step-2/divisional-attribute-wizard-step2.component';
import { DivisionalAttributeWizardStep3Component } from './components/divisional-attributes/divisional-attribute-wizard/step-3/divisional-attribute-wizard-step3.component';
import { DivisionalAttributeWizardStep4Component } from './components/divisional-attributes/divisional-attribute-wizard/step-4/divisional-attribute-wizard-step4.component';
import { ExpansionOptionImagesTabPanelComponent } from './components/divisional-attributes/divisional-options/expansion-option-images-tab-panel/expansion-option-images-tab-panel.component';
import { ImageUrlToAssetIdPipe } from './components/divisional-attributes/shared/pipes/image-url-to-asset-id/image-url-to-asset-id.pipe';

const moduleRoutes: Routes = [
    {
        path: 'divisional',
        component: DivisionalComponent,
        canActivate: [],
        data: {},
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'divisional-catalog' },
			{ path: 'divisional-catalog', component: DivisionalCatalogComponent },
			{
				path: 'divisional-catalog-wizard', component: DivisionalCatalogWizardComponent,
				children: [
					{ path: '', pathMatch: 'full', redirectTo: 'step-1' },
					{ path: 'step-1', component: DivisionalCatalogWizardStep1Component },
					{ path: 'step-2', component: DivisionalCatalogWizardStep2Component },
					{ path: 'step-3', component: DivisionalCatalogWizardStep3Component },
					{ path: 'step-4', component: DivisionalCatalogWizardStep4Component }
				]
			},
            { path: 'divisional-attributes', component: DivisionalAttributesComponent },
            {
                path: 'divisional-attributes/:marketId',
                component: DivisionalAttributesComponent,
                children: [
                    { path: '', pathMatch: 'full', redirectTo: 'attributes' },
                    { path: 'attributes', component: AttributesContainerComponent },
                    { path: 'attribute-groups', component: AttributeGroupsContainerComponent },
                    { path: 'locations', component: LocationsContainerComponent },
					{ path: 'location-groups', component: LocationGroupsContainerComponent },
					{ path: 'divisional-options', component: DivisionalOptionsContainerComponent },
					{ path: 'divisional-choices', component: DivChoicesContainerComponent },
					{
						path: 'divisional-attribute-wizard', component: DivisionalAttributeWizardComponent,
						children: [
							{ path: '', pathMatch: 'full', redirectTo: 'step-1' },
							{ path: 'step-1', component: DivisionalAttributeWizardStep1Component },
							{ path: 'step-2', component: DivisionalAttributeWizardStep2Component },
							{ path: 'step-3', component: DivisionalAttributeWizardStep3Component },
							{ path: 'step-4', component: DivisionalAttributeWizardStep4Component }
						]
					}
                ]
            }
        ]
    }
];

@NgModule({
    declarations: [
        DivisionalComponent,
		DivisionalCatalogComponent,
		DivisionalCatalogWizardComponent,
		DivisionalCatalogWizardStep1Component,
		DivisionalCatalogWizardStep2Component,
		DivisionalCatalogWizardStep3Component,
		DivisionalCatalogWizardStep4Component,
        DivisionalAttributesComponent,
        DivisionalAttributeTemplateComponent,
        DivisionalAttributeActionsComponent,
        AttributesContainerComponent,
        AttributesPanelComponent,
		AttributesSidePanelComponent,
		AttributeDetailsTabComponent,
	    AttributeGroupsTabComponent,
        AttributeGroupsContainerComponent,
        AttributeGroupsPanelComponent,
		AttributeGroupsSidePanelComponent,
		AssociateAttributesSidePanelComponent,
		ExpansionAttributesTabPanelComponent,
        LocationsContainerComponent,
        LocationsPanelComponent,
		LocationsSidePanelComponent,
		ExpansionAssociatedLocationGroupTabPanelComponent,
		LocationsDetailsTabComponent,
	    LocationsGroupsTabComponent,
        LocationGroupsContainerComponent,
        LocationGroupsPanelComponent,
		LocationGroupsSidePanelComponent,
		AssociateLocationsSidePanelComponent,
		ExpansionLocationsTabPanelComponent,
		ExpansionTabPanelComponent,
	    StatusBarComponent,
		DivisionalCatalogReactivateComponent,
		ChoiceSidePanelComponent,
		PointSidePanelComponent,
		PointTypeComponent,
		DivisionalOptionsContainerComponent,
		DivisionalOptionsPanelComponent,
		DivChoicesContainerComponent,
		DivChoicesPanelComponent,
		ExpansionChoiceAttributeGroupsTabPanelComponent,
		ExpansionChoiceCommunitiesTabPanelComponent,
		ExpansionChoiceImagesTabPanelComponent,
		ExpansionChoiceLocationGroupsTabPanelComponent,
		DivOptionsAttributeGroupsSidePanelComponent,
		DivOptionsLocationGroupsSidePanelComponent,
		ExpansionAttributeGroupsTabPanelComponent,
		ExpansionLocationGroupsTabPanelComponent,
		ExpansionAssociateCommunitiesTabPanelComponent,
		ExpansionAssociateGroupsTabPanelComponent,
	    AssociateCommunitiesSidePanelComponent,
		GroupCommunitiesPipe,
		GroupOptionsPipe,
		GroupChoicesPipe,
		DivisionalAttributeWizardComponent,
		DivisionalAttributeWizardStep1Component,
		DivisionalAttributeWizardStep2Component,
		DivisionalAttributeWizardStep3Component,
		DivisionalAttributeWizardStep4Component,
		ExpansionOptionImagesTabPanelComponent,
		ImageUrlToAssetIdPipe
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        CalendarModule,
		CheckboxModule,
		TabViewModule,
		NgbModule,
		ToastModule,
		MessagesModule,
		PhdCommonModule,
		RouterModule.forChild(moduleRoutes),
		ngxInfiniteScroll.InfiniteScrollModule,
		DropdownModule,
		CloudinaryModule
    ],
	providers: [
		ImageUrlToAssetIdPipe
    ]
})
export class DivisionalModule 
{

}
