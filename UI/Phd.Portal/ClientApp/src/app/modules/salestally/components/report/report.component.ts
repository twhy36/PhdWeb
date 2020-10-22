import { Component, OnInit } from '@angular/core';

import { TreeNode } from 'primeng/api';
import * as _ from 'lodash';
import { Observable } from 'rxjs';

import { SalesTallyService } from '../../../core/services/salestally.service';
import { TopCommunity, TopMarket, TopSalesConsultant, TimeFrame, AreaSales } from '../../../shared/models/salestally.model';

@Component({
	selector: 'report',
	templateUrl: './report.component.html',
	styleUrls: ['./report.component.scss']
})

export class ReportComponent implements OnInit
{
	areaSales: TreeNode[];
	topMarkets: TopMarket[] = [];
	topCommunities: TopCommunity[] = [];
	topSalesConsultants: TopSalesConsultant[] = [];
	timeFrame = TimeFrame.CurrentWeek;
	TimeFrameType = TimeFrame;

	constructor(private salesTallyService: SalesTallyService) { }

	ngOnInit()
	{
		this.updateTop10Data(this.timeFrame);
		this.getAreaSalesData().subscribe(salesData =>
			this.areaSales = this.getSalesData(salesData)
		);
	}

	updateTop10Data(updateTimeFrame: TimeFrame)
	{
		this.timeFrame = updateTimeFrame;
		this.salesTallyService.getTopCommunity(this.timeFrame).subscribe((data: TopCommunity[]) =>
		{
			this.topCommunities = data;
		});

		this.salesTallyService.getTopMarket(this.timeFrame).subscribe((data: TopMarket[]) =>
		{
			this.topMarkets = data;
		});

		this.salesTallyService.getTopSalesConsultant(this.timeFrame).subscribe((data: TopSalesConsultant[]) =>
		{
			this.topSalesConsultants = data;
		});
	}

	getAreaSalesData(): Observable<AreaSales[]>
	{
		return this.salesTallyService.getAreaSales();
	}

	collapseAll(): void {
		function collapse(data: TreeNode[]) {
			data.forEach(node => {
				node.expanded = false;
				collapse(node.children);
			});
		}

		collapse(this.areaSales);

		this.areaSales = this.areaSales.slice();
	}

	expandAll(): void {
		function expand(data: TreeNode[]) {
			data.forEach(node => {
				node.expanded = true;
				expand(node.children);
			});
		}

		expand(this.areaSales);

		this.areaSales = this.areaSales.slice();
	}

	/*
	 * Create summary of sales data for all the sales data objects passed in
	 */
	getSalesData(areaData: AreaSales[]): TreeNode[]
	{
		let allPending: number = 0;
		let allCurrentSignups: number = 0;
		let allCurrentCancel: number = 0;
		let allCurrentNet: number = 0;
		let allMtdSignups: number = 0;
		let allMtdCancel: number = 0;
		let allMtdNet: number = 0;
		let allCurrentDaySignups: number = 0;
		let allPreviousDaySignups: number = 0;

		for (let area of areaData) {
			allPending += area.pending;
			allCurrentSignups += area.currentSignups;
			allCurrentCancel += area.currentCancellations;
			allCurrentNet += area.currentNet;
			allMtdSignups += area.mtdSignups;
			allMtdCancel += area.mtdCancellations;
			allMtdNet += area.mtdNet;
			allCurrentDaySignups += area.currentDaySignups;
			allPreviousDaySignups += area.previousDaySignups;
		}

		function getNodes(data: AreaSales[], groupBy: string[]) {
			let groups = _.groupBy(data, groupBy[0]);
			return Object.keys(groups).sort().map(group => ({
				data: {
					name: group,
					pending: _.sumBy(groups[group], 'pending'),
					currentSignups: _.sumBy(groups[group], 'currentSignups'),
					currentCancellations: _.sumBy(groups[group], 'currentCancellations'),
					currentNet: _.sumBy(groups[group], 'currentNet'),
					mtdSignups: _.sumBy(groups[group], 'mtdSignups'),
					mtdCancellations: _.sumBy(groups[group], 'mtdCancellations'),
					mtdNet: _.sumBy(groups[group], 'mtdNet'),
					currentDaySignups: _.sumBy(groups[group], 'currentDaySignups'),
					previousDaySignups: _.sumBy(groups[group], 'previousDaySignups')
				},
				children: groupBy.length > 1 ? getNodes(groups[group], groupBy.slice(1)) : [],
				expanded: false
			}));
		}

		const salesData: TreeNode =
		{
			data: {
				name: 'All Areas',
				pending: allPending,
				currentSignups: allCurrentSignups,
				currentCancellations: allCurrentCancel,
				currentNet: allCurrentNet,
				mtdSignups: allMtdSignups,
				mtdCancellations: allMtdCancel,
				mtdNet: allMtdNet,
				currentDaySignups: allCurrentDaySignups,
				previousDaySignups: allPreviousDaySignups
			},
			children: getNodes(areaData, ['area', 'division', 'communityName', 'salesConsultant']),
			expanded: false
		};

		return [salesData];
	}
}
