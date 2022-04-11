import { Injectable } from '@angular/core';

import { combineLatest } from 'rxjs/operators';

import * as _ from 'lodash';

import { select, Store } from '@ngrx/store';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromPlan from '../../ngrx-store/plan/reducer';
import * as fromSalesAgreement from '../../ngrx-store/sales-agreement/reducer';

import { Choice, Group, JobChoice, MyFavorite, MyFavoritesChoice, Tree, TreeVersion, UnsubscribeOnDestroy } from 'phd-common';

import { BrandService } from './brand.service';
import { FavoriteService } from './favorite.service';
import { environment } from '../../../../environments/environment';

import { PageLoadEvent } from '../../shared/models/adobe/page-load-event';
import { SearchEvent } from '../../shared/models/adobe/search-event';
import { AlertEvent } from '../../shared/models/adobe/alert-event';
import { AdobeChoice, FavoriteEvent, FavoriteUpdateEvent } from '../../shared/models/adobe/favorite-event';


@Injectable()
export class AdobeService extends UnsubscribeOnDestroy {
	environment = environment;
    choices: Choice[];

	constructor(
        private store: Store<fromRoot.State>,
		private brandService: BrandService,
        private favoriteService: FavoriteService) {
            super();
	    }

    setPageLoadEvent(adobeLoadInitialized: boolean, pageType: string,
        pageName: string, groupName: string, subGroupName: string) {
        window['appEventData'] = window['appEventData'] || [];
        this.store.pipe(
            this.takeUntilDestroyed(),
            select(state => state.org),
            combineLatest(
                this.store.pipe(select(fromRoot.financialCommunityName)),
                this.store.pipe(select(fromRoot.financialCommunityId)),
                this.store.pipe(select(fromPlan.selectedPlanData)),
                this.store.pipe(select(fromSalesAgreement.salesAgreementId)),
                this.store.pipe(select(fromRoot.isBuyerMode))
                )
        ).subscribe(([org, communityName, communityId, planData, sagId, isBuyerMode]) => {
            if (isBuyerMode && !adobeLoadInitialized && org?.salesCommunity?.market?.name && communityName && communityId && planData && sagId) {
                let pageLoadEvent = new PageLoadEvent();
                let baseUrl = window.location.host;

                pageLoadEvent.page.pageType = pageType;
                pageLoadEvent.page.pageURL = baseUrl + window.location.pathname;
                pageLoadEvent.page.pageName = pageName;
                pageLoadEvent.page.brandName = this.brandService.getBrandName(environment.brandMap, baseUrl);;
                pageLoadEvent.page.group = groupName;
                pageLoadEvent.page.subGroup = subGroupName;

                pageLoadEvent.contract.communityName = communityName;
                pageLoadEvent.contract.communityNumber = communityId;
                pageLoadEvent.contract.planName = planData && planData.salesName;
                pageLoadEvent.contract.market = org?.salesCommunity?.market?.name;
                pageLoadEvent.contract.salesAgreementNumber = sagId;

                adobeLoadInitialized = true;

                window['appEventData'].push(pageLoadEvent);
            }
        });
    }

    setSearchEvent(term: string, tree: TreeVersion) {
        window['appEventData'] = window['appEventData'] || [];

        if (term.length > 2) {
            const choices = _.flatMap(tree.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices))) || [];
            const searchEvent = new SearchEvent(term, choices.length);

            window['appEventData'].push(searchEvent);
        }
    }

    setAlertEvent(message: string) {
        window['appEventData'] = window['appEventData'] || [];
				const alertEvent = new AlertEvent(message);

				window['appEventData'].push(alertEvent);
    }

    packageFavoriteEventData(postSaveFavoriteChoices: MyFavoritesChoice[], myFavorite: MyFavorite, tree: Tree, groups: Group[], salesChoices: JobChoice[]) {
        const favoriteChoices = (myFavorite ? myFavorite.myFavoritesChoice : []) || [];
        const updatedChoices = this.favoriteService.getMyFavoritesChoices(tree, salesChoices, favoriteChoices);	// Use this
        const choices = [...updatedChoices, ...favoriteChoices];
        postSaveFavoriteChoices.forEach(res => {
            let resChoice = res as MyFavoritesChoice;
            if (resChoice) {
                const choice = choices.find(x => x.dpChoiceId === resChoice.dpChoiceId); // Need this exact choice/format of choice
                if (choice && !choice.removed) {
                    this.setFavoriteEvent(new AdobeChoice(choice), groups, favoriteChoices);
                }
            }
        })
    }

    setFavoriteEvent(choice: AdobeChoice, groups: Group[], favoriteChoices: MyFavoritesChoice[]) {
        let favoriteEvent = new FavoriteEvent();
        let favoriteUpdateEvent = new FavoriteUpdateEvent();

        window['appEventData'] = window['appEventData'] || [];

        if (choice && !choice.removed && groups) {
            const choices = _.flatMap(groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices.filter(ch => ch.quantity > 0)))) || [];
            const treeChoice = choices.find(c => choice.divChoiceCatalogId === c.divChoiceCatalogId);

            favoriteEvent.favorite.choiceId = choice.dpChoiceId;
            favoriteEvent.favorite.divChoiceCatalogId = choice.divChoiceCatalogId;
            favoriteEvent.favorite.choice = treeChoice?.label;
            favoriteEvent.favorite.price = treeChoice?.price;
            favoriteEvent.favorite.decisionPoint = choice.decisionPointLabel;
            favoriteEvent.favorite.quantity = choice.dpChoiceQuantity;
            favoriteEvent.favorite.attribute = '';
            favoriteEvent.favorite.location = '';

            if (choice.attributes.length === 0 && choice.locations.length === 0) {
                window['appEventData'].push(favoriteEvent);
            } else if (choice.attributes.length > 0 && choice.locations.length === 0 && !choice.attributes[0].removed) {
                let attribute = choice.attributes[0];
                favoriteUpdateEvent.favorite = favoriteEvent.favorite;

                favoriteUpdateEvent.favorite.attribute = attribute.attributeGroupLabel + ' | ' + attribute.attributeName;
                favoriteUpdateEvent.favorite.location = '';
                if (!!!favoriteChoices.find(c => c.divChoiceCatalogId === choice.divChoiceCatalogId)) {
                    window['appEventData'].push(favoriteEvent);
                }

                window['appEventData'].push(favoriteUpdateEvent);

            } else if (choice.attributes.length === 0 && choice.locations.length > 0 && !choice.locations[0].removed) {
                let location = choice.locations[0];
                let nestedAttribute = location.attributes[0];

                favoriteUpdateEvent.favorite = favoriteEvent.favorite;

                favoriteUpdateEvent.favorite.attribute = nestedAttribute ? nestedAttribute.attributeGroupLabel + ' | ' + nestedAttribute.attributeName : '';
                favoriteUpdateEvent.favorite.location = location.locationName;

                if (!!!nestedAttribute || !nestedAttribute?.removed) {
                    if (!!!favoriteChoices.find(c => c.divChoiceCatalogId === choice.divChoiceCatalogId)) {
                        window['appEventData'].push(favoriteEvent);
                    }
                    window['appEventData'].push(favoriteUpdateEvent);
                }
            }
        }
    }
}
