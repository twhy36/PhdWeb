import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, Router, NavigationEnd } from '@angular/router';
import { SiteMenuComponent } from '../site-menu/site-menu.component';
import { Store, select } from '@ngrx/store';

import { map, distinctUntilChanged, filter, combineLatest, withLatestFrom } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { Group, Constants } from 'phd-common';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as fromChangeOrder from '../../../ngrx-store/change-order/reducer';
@Component({
	selector: 'navigation',
	templateUrl: 'navigation.component.html',
	styleUrls: ['navigation.component.scss']
})

export class NavigationComponent implements OnInit
{

	@ViewChild(SiteMenuComponent)
	private siteMenu: SiteMenuComponent;

	scenarioName$: Observable<string>;
	scenarioId$: Observable<number>;
	groups$: Observable<Observable<Group>[]>;
	selectedGroup$: Observable<number>;
	isPreview$: Observable<boolean>;
	isDesignPreviewEnabled$: Observable<boolean>;
	opportunityName$: Observable<string>;
	salesAgreementId$: Observable<number>;
	buildMode$: Observable<string>;

	constructor(private store: Store<fromRoot.State>, private route: ActivatedRoute, private router: Router) { }

	ngOnInit()
	{
		//this is a pain. The NGX-DragScroll library uses HostListener for mouse move events, which causes a change detection cycle to run every time you move the mouse on the
		//experience screen. So there is now a calculated status on all groups, subgroups, and decision points, instead of using a pipe. That means we have to monitor changes to the
		//tree here - if we just emit the whole tree, though, it causes a flicker on every status icon (due to the animations). So to resolve that, there is this complicated
		//piece of code that creates a separate observable for each group, which only emits a new value when the individual group status changes.
		this.groups$ = this.store.pipe(
			select(fromRoot.filteredTree),
			distinctUntilChanged((x, y) => x && y && x.groups.length === y.groups.length
				&& x.groups.every((g, i) => g.id === y.groups[i].id && g.subGroups.length === y.groups[i].subGroups.length
					&& g.subGroups.every((sg, j) => sg.id === y.groups[i].subGroups[j].id && sg.points.length === y.groups[i].subGroups[j].points.length
						&& sg.points.every((pt, k) => pt.id === y.groups[i].subGroups[j].points[k].id && pt.choices.length === y.groups[i].subGroups[j].points[k].choices.length
						)))),
			map(tree => tree ? tree.groups.map(g =>
			{
				return this.store.pipe(
					select(fromRoot.filteredTree),
					filter(tree => !!tree),
					map(tree => tree.groups.find(gr => gr.id === g.id)),
					distinctUntilChanged((x, y) => x && y && x.status === y.status)
				)
			}) : <Observable<Group>[]>[])
		);

		this.scenarioName$ = this.store.pipe(
			select(state => state.scenario.scenario),
			map(scenario => scenario ? scenario.scenarioName : null)
		);

		//could rename scenarioId here since it could be a sales agreement id
		this.scenarioId$ = this.store.pipe(
			select(state => state.scenario.scenario),
			withLatestFrom(this.store.pipe(select(state => state.salesAgreement))),
			map(([scenario, sag]) => sag.id || (scenario ? scenario.scenarioId : null))
		);

		this.isPreview$ = this.store.pipe(
			select(fromScenario.isPreview)
		);

		this.isDesignPreviewEnabled$ = this.store.pipe(
			select(fromRoot.isDesignPreviewEnabled));

		this.buildMode$ = this.store.pipe(
			select(fromScenario.buildMode));

		this.opportunityName$ = this.store.pipe(
			select(state => state.opportunity.opportunityContactAssoc),
			combineLatest(this.buildMode$,
				this.store.pipe(select(fromChangeOrder.currentChangeOrder))),
			map(([oppContact, buildMode, currentCO]) =>
			{
				if (buildMode === Constants.BUILD_MODE_SPEC || buildMode === Constants.BUILD_MODE_MODEL)
				{
					return buildMode;
				}
				else if (currentCO && currentCO.jobChangeOrders && currentCO.jobChangeOrders.find(t => t.jobChangeOrderTypeDescription === 'BuyerChangeOrder'))
				{
					let jobChangeOrder = currentCO.jobChangeOrders.find(t => t.jobChangeOrderTypeDescription === 'BuyerChangeOrder');
					let salesChangeOrderBuyer = jobChangeOrder.jobSalesChangeOrderBuyers.find(t => t.isPrimaryBuyer === true && t.action === 'Add');
					return salesChangeOrderBuyer ? `${salesChangeOrderBuyer.opportunityContactAssoc.contact.firstName || ''} ${salesChangeOrderBuyer.opportunityContactAssoc.contact.lastName || ''} ${salesChangeOrderBuyer.opportunityContactAssoc.contact.suffix || ''}` : null;
				}
				else if (oppContact && oppContact.contact)
				{
					return `${oppContact.contact.firstName || ''} ${oppContact.contact.lastName || ''} ${oppContact.contact.suffix || ''}`;
				}
			}),
			filter(contact => !!contact)
		);
		this.salesAgreementId$ = this.store.pipe(
			select(state => state.salesAgreement),
			map(salesAgreement => salesAgreement ? salesAgreement.id : null)
		)

		//inspect the route snapshot to find out which group, if any, is selected in the nav bar
		this.selectedGroup$ = this.router.events.pipe(
			filter(evt => evt instanceof NavigationEnd),
			map(() => +this.getParam(this.route.snapshot.root, "divDPointCatalogId")),
			filter(divDPointCatalogId => !!divDPointCatalogId),
			combineLatest(this.store.pipe(select(fromRoot.filteredTree), filter(tree => !!tree))),
			map(([divDPointCatalogId, tree]) =>
			{
				let grp = tree.groups.find(g => !!g && g.subGroups.some(sg => !!sg && sg.points.some(p => p.divPointCatalogId === divDPointCatalogId)));
				return grp ? grp.id : null;
			})
		);
	}

	private getParam(route: ActivatedRouteSnapshot, param: string): string
	{
		if (route.paramMap.get(param))
		{
			return route.paramMap.get(param);
		}

		if (!route.children || !route.children.find(c => c.outlet === 'primary'))
		{
			return null;
		} else
		{
			return this.getParam(route.children.find(c => c.outlet === 'primary'), param);
		}
	}

	siteButtonClicked()
	{
		this.siteMenu.toggleSiteMenuState();
	}
}
