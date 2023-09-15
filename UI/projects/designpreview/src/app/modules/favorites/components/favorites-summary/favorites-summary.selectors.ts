import { createSelector } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromApp from '../../../ngrx-store/app/reducer';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';

// Not committed to selector file for each component, might be easier to find exactly
// the selector you need rather than them all in one file
export const selectFavoriteSummaryViewModel = createSelector(
	fromScenario.selectScenario,
	fromSalesAgreement.salesAgreementState,
	fromRoot.favoriteTitle,
	fromFavorite.currentMyFavorite,
	fromPlan.selectedPlanData,
	fromRoot.financialCommunityName,
	fromRoot.elevationImageUrl,
	fromSalesAgreement.selectSelectedLot,
	fromRoot.filteredTree,
	fromFavorite.favoriteState,
	fromApp.showWelcomeModal,
	(
		scenario,
		sag,
		favTitle,
		favs,
		planName,
		communityName,
		elevationImageUrl,
		lot,
		filteredTree,
		favState,
		showWelcomeModal
	) => 
	{
		return {
			// create View Model with constructor? https://www.intertech.com/top-5-ways-to-misuse-ngrx-selectors/
			buildMode: scenario.buildMode,
			isDesignComplete: sag.isDesignComplete,
			favoriteTitle: favTitle,
			sagId: sag.id,
			favoritesId: favs.id,
			planName: planName,
			communityName: communityName,
			elevationImageUrl: elevationImageUrl,
			lot: lot,
			filteredTree: filteredTree,
			salesChoices: favState.salesChoices,
			includeContractedOptions: favState.includeContractedOptions,
			myFavorites: favState.myFavorites,
			tree: scenario.tree,
			showWelcomeModal: showWelcomeModal,
			isFloorplanFlipped: sag.isFloorplanFlipped,
			presalePricingEnabled: scenario.presalePricingEnabled,
			salesAgreementLoading: sag.salesAgreementLoading,
			salesAgreementLoadError: sag.loadError
		};
	}
);
