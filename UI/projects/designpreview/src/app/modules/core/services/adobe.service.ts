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
import { Router, RouterStateSnapshot, RoutesRecognized } from '@angular/router';
import { ClickEvent } from '../../shared/models/adobe/click-event';
import { ErrorEvent } from '../../shared/models/adobe/error-event';


@Injectable()
export class AdobeService extends UnsubscribeOnDestroy {
	environment = environment;
    choices: Choice[];
    pageLoadExecuted: boolean = false;

	constructor(
        private store: Store<fromRoot.State>,
		private brandService: BrandService,
        private favoriteService: FavoriteService,
        private router: Router) {
            super();
            this.router.events.subscribe(data => {
                if (data instanceof RoutesRecognized && data?.state) {
                    this.pageLoadExecuted = false;
                    this.detectPageLoad(this.findPageLoadData(data?.state));
                }
            })
	    }

        findPageLoadData(snap: RouterStateSnapshot): string {
            let nextSnap = snap?.root;
            while (!!nextSnap) {
                if (nextSnap?.data['pageLoadEvent']) {
                    return nextSnap?.data['pageLoadEvent']
                } else {
                    nextSnap = nextSnap.firstChild;
                }
            }
            return '';
        }

        detectPageLoad(page: string) {
            if (!this.pageLoadExecuted && !!page) {
                this.store.pipe(
                    this.takeUntilDestroyed(),
                    select(state => state?.favorite),
                    combineLatest(
                        this.store.pipe(select(fromRoot.filteredTree)),
                        this.store.pipe(select(state => state.nav)),
                        )
                ).subscribe(([fav, tree, nav]) => {
                    if (fav && tree && !this.pageLoadExecuted) {
                        const subGroups = _.flatMap(tree.groups, g => _.flatMap(g.subGroups)) || [];
                        const points = _.flatMap(subGroups, sg => sg.points) || [];
                        const choices = _.flatMap(points, p => p.choices) || [];

                        const selectedSubGroup = subGroups.find(sg => sg.id === nav.selectedSubGroup);
                        const selectedPoint = points.find(p => p.id === nav.selectedPoint);
                        const selectedChoice = choices.find(c => c.id === nav.selectedChoice);

                        if (page === 'Home') {
                            this.setPageLoadEvent(this.pageLoadExecuted, 'Home Page', 'Home', '', '');
                        } else if (page === 'FloorplanSummary') {
                            this.setPageLoadEvent(this.pageLoadExecuted, 'Floorplan Page', 'Floorplan', '', '');
                        } else if (page === 'ContractedSummary') {
                            this.setPageLoadEvent(this.pageLoadExecuted, 'Contracted Options Page', 'Contracted Options', '', '');
                        } else if (page === 'FavoritesSummary') {
                            this.setPageLoadEvent(this.pageLoadExecuted, 'Favorites Summary Page', 'Favorites Summary', '', '');
                        } else if (page === 'ChoiceDetail') {
                            const group = tree.groups.find(g => g.subGroups.find(sg => sg.id === selectedSubGroup?.id));
                            if (!!group && !!selectedSubGroup && !!selectedChoice && !!selectedPoint) {
                                this.setPageLoadEvent(this.pageLoadExecuted, 'Choice Card Detail Page', selectedPoint?.label + ' / ' + selectedChoice.label, group?.label, selectedSubGroup?.label);
                            }
                        } else if (page === 'ChoiceCard') {
                            const group = tree.groups.find(g => g.subGroups.find(sg => sg.id === selectedSubGroup?.id));
                            const pageName = group?.label + ' / ' + selectedSubGroup?.label;

                            if (!!group && !!selectedSubGroup) {
                                if (selectedSubGroup?.useInteractiveFloorplan) {
                                    this.setPageLoadEvent(this.pageLoadExecuted, 'IFP Choice Card Page', pageName, group?.label, selectedSubGroup?.label);
                                } else {
                                    this.setPageLoadEvent(this.pageLoadExecuted, 'Choice Card Page', pageName, group?.label, selectedSubGroup?.label);   
                                }
                            }
                        }
                    }
                });
            }
        }

    setPageLoadEvent(adobeLoadInitialized: boolean, pageType: string,
        pageName: string, groupName: string, subGroupName: string) {
        window['appEventData'] = window['appEventData'] || [];
        if (!adobeLoadInitialized) {
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

                    if ((window['appEventData'][window['appEventData'].length - 1]?.page?.pageName !== pageLoadEvent?.page?.pageName) || !!!window['appEventData'][window['appEventData'].length - 1]?.page) {
                        window['appEventData'].push(pageLoadEvent);
                        this.pageLoadExecuted = true;
                    }
                }
            });
        }
    }

    setSearchEvent(term: string, tree: TreeVersion) {
        window['appEventData'] = window['appEventData'] || [];

        if (term?.length > 2) {
            const choices = _.flatMap(tree.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices))) || [];
            const searchEvent = new SearchEvent(term, choices.length);

            window['appEventData'].push(searchEvent);
        }
    }

    setAlertEvent(message: string, type: string) {
        window['appEventData'] = window['appEventData'] || [];
				const alertEvent = new AlertEvent(message, type);

				window['appEventData'].push(alertEvent);
    }

    setClickEvent(container: string, element: string, text: string) {
        window['appEventData'] = window['appEventData'] || [];
				const clickEvent = new ClickEvent(container, element, text);

				window['appEventData'].push(clickEvent);
    }

    packageFavoriteEventData(postSaveFavoriteChoices: MyFavoritesChoice[], myFavorite: MyFavorite, tree: Tree, groups: Group[], salesChoices: JobChoice[]) {
        const favoriteChoices = (myFavorite ? myFavorite.myFavoritesChoice : []) || [];
        const updatedChoices = this.favoriteService.getMyFavoritesChoices(tree, salesChoices, favoriteChoices);
        const choices = [...updatedChoices, ...favoriteChoices];
        postSaveFavoriteChoices.forEach(res => {
            let resChoice = res as MyFavoritesChoice;
            if (resChoice) {
                const choice = choices.find(x => x.dpChoiceId === resChoice.dpChoiceId);
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
            favoriteEvent.favorite.price = treeChoice?.priceHiddenFromBuyerView ? 'Pricing Varies' : treeChoice?.price.toString();
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

    setErrorEvent(error: string) {
        let errorEvent = new ErrorEvent(error);

        window['appEventData'] = window['appEventData'] || [];
        if (errorEvent && errorEvent?.error?.message?.length) {
            window['appEventData'].push(errorEvent);
        }
    }
}
