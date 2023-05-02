import { Component, OnInit, ViewChild } from '@angular/core';

import { TreeTable } from 'primeng/treetable';
import { TreeNode } from 'primeng/api';
import * as _ from 'lodash';
import { Observable } from 'rxjs';

import { BrowserService } from 'phd-common';
import { SalesTallyService } from '../../../core/services/salestally.service';
import { TopCommunity, TopMarket, TopSalesConsultant, TimeFrame, AreaSales, ConsultantBuyer } from '../../../shared/models/salestally.model';

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
	isMobile: boolean = false;
	showTopMarkets: boolean = true;
	showTopCommunities: boolean = true;
	showTopSalesConsultants: boolean = true;
	cols: any[];
	isPortrait: boolean = false;
	frozenWidth: string = '280px';

	@ViewChild("salesTree") salesTree: TreeTable;

	constructor(private salesTallyService: SalesTallyService, private browser: BrowserService) { }

	ngOnInit()
	{
		this.updateTop10Data(this.timeFrame);
		this.getAreaSalesData().subscribe(salesData =>
			this.areaSales = this.getSalesData(salesData)
		);

		var ua = window.navigator.userAgent;
		if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua)) {
			this.isMobile = true;
			this.showTopMarkets = false;
			this.showTopCommunities = false;
			this.showTopSalesConsultants = false;
		}

		this.cols = [
			{ 
				field: 'name',
				firstHeader: '', 
				secondHeader: '', 
				headerColspan: '4',
				bodyColspan: '4', 
				displayHeader: true,
				headerClass: '',
				displayInMobile: true
			},		
			{ 
				field: 'pending', 
				firstHeader: 'Total', 
				secondHeader: 'In Process', 
				headerColspan: '1', 
				bodyColspan: '1', 
				displayHeader: true,
				headerClass: 'phd-stlly-first-header',
				displayInMobile: true 
			},
			{ 
				field: 'previousDayNetAdd', 
				firstHeader: 'Previous Day', 
				secondHeader: 'Net', 
				headerColspan: '1', 
				bodyColspan: '1', 
				displayHeader: true,
				headerClass: 'phd-stlly-first-header',
				displayInMobile: false 
			},		
			{ 
				field: 'currentDayNetAdd', 
				firstHeader: 'Current Day', 
				secondHeader: 'Net', 
				headerColspan: '1', 
				bodyColspan: '1', 
				displayHeader: true,
				headerClass: 'phd-stlly-first-header',
				displayInMobile: false 
			},						
			{ 
				field: 'currentSignups', 
				firstHeader: 'Current Week', 
				secondHeader: 'Signups', 
				headerColspan: '3', 
				bodyColspan: '1', 
				displayHeader: true,
				headerClass: 'phd-stlly-first-header-wide',
				displayInMobile: true 
			},
			{ 
				field: 'currentCancellations', 
				firstHeader: 'Current Week', 
				secondHeader: 'Cancels', 
				headerColspan: '1', 
				bodyColspan: '1', 
				displayHeader: false,
				headerClass: '',
				displayInMobile: true
			},
			{ 
				field: 'currentNet', 
				firstHeader: 'Current Week', 
				secondHeader: 'Net', 
				headerColspan: '1', 
				bodyColspan: '1', 
				displayHeader: false,
				headerClass: '',
				displayInMobile: true 
			},
			{ 
				field: 'mtdSignups', 
				firstHeader: 'Month To Date', 
				secondHeader: 'Signups', 
				headerColspan: '3', 
				bodyColspan: '1', 
				displayHeader: true,
				headerClass: 'phd-stlly-first-header-wide',
				displayInMobile: true  
			},
			{ 
				field: 'mtdCancellations', 
				firstHeader: 'Month To Date', 
				secondHeader: 'Cancels', 
				headerColspan: '1', 
				bodyColspan: '1', 
				displayHeader: false,
				headerClass: '',
				displayInMobile: true 
			},
			{ 
				field: 'mtdNet', 
				firstHeader: 'Month To Date', 
				secondHeader: 'Net', 
				headerColspan: '1', 
				bodyColspan: '1', 
				displayHeader: false,
				headerClass: '',
				displayInMobile: true
			}
		];

		this.browser.clientWidth().subscribe(width => {
			if (!this.isPortrait && width < 500) 
			{
				this.isPortrait = true;
			} 
			else if (this.isPortrait && width >= 500)
			{
				this.isPortrait = false;
			}

			if (width >= 400 && width < 450 && this.frozenWidth !== '260px')
			{
				this.frozenWidth = '260px';
			}
			else if (width < 400 && this.frozenWidth !== '240px')
			{
				this.frozenWidth = '240px';
			}
		});
		
	}

	get scrollableCols() : any[] 
	{
		return this.cols.filter(c => c.field !== 'name' && !!c.displayInMobile);
	}

	get frozenCols() : any[] 
	{
		return this.cols.filter(c => c.field === 'name' );
	}

	displayInMobile(col: any) : boolean
	{
		return !this.isMobile || col.displayInMobile;
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
		let allCurrentDayNetAdd: number = 0;
		let allPreviousDayNetAdd: number = 0;

		for (let area of areaData) {
			allPending += area.pending;
			allCurrentSignups += area.currentSignups;
			allCurrentCancel += area.currentCancellations;
			allCurrentNet += area.currentNet;
			allMtdSignups += area.mtdSignups;
			allMtdCancel += area.mtdCancellations;
			allMtdNet += area.mtdNet;
			allCurrentDayNetAdd += area.currentDayNetAdd;
			allPreviousDayNetAdd += area.previousDayNetAdd;
		}

		function getLastNode(isMobile: boolean, groupData: Array<AreaSales>) {
			if (isMobile || !groupData || !groupData.length) {
				return [];
			}

			// Will not display buyers for pending sales
			const nonPendingSales = groupData.find(x => {
				return x.currentSignups !== 0 || x.currentCancellations !== 0
					|| x.currentNet !== 0 || x.mtdSignups !== 0 || x.mtdCancellations !== 0
					|| x.mtdNet !== 0 || x.currentDayNetAdd !== 0 || x.previousDayNetAdd !== 0;
			});

			if (!nonPendingSales) {
				return [];
			}

			return [{
						data: {
							name: '...',
							pending: 0,
							currentSignups: 0,
							currentCancellations: 0,
							currentNet: 0,
							mtdSignups: 0,
							mtdCancellations: 0,
							mtdNet: 0,
							currentDayNetAdd: 0,
							previousDayNetAdd: 0,
							salesConsultantId: groupData[0].salesConsultantId,
							communityId: groupData[0].communityId
						},
						children: [],
						expanded: false
					}];
		}

		function getNodes(data: AreaSales[], groupBy: string[], isMobile: boolean) {
			let groups = _.groupBy(data, groupBy[0]) as unknown as AreaSales[];
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
					currentDayNetAdd: _.sumBy(groups[group], 'currentDayNetAdd'),
					previousDayNetAdd: _.sumBy(groups[group], 'previousDayNetAdd')
				},
				children: groupBy.length > 1 ? getNodes(groups[group], groupBy.slice(1), isMobile) : getLastNode(isMobile, groups[group]),
				expanded: false
			}));
		}

		const groupBys = this.isMobile ? ['area', 'division', 'communityName'] : ['area', 'division', 'communityName', 'salesConsultant'];
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
				currentDayNetAdd: allCurrentDayNetAdd,
				previousDayNetAdd: allPreviousDayNetAdd
			},
			children: getNodes(areaData, groupBys, this.isMobile),
			expanded: false
		};

		return [salesData];
	}

	onNodeExpand(event) {
		const node = event.node;
		if (node.children.length === 1 && node.children[0].data.name === '...') {
			const salesConsultantId = node.children[0].data.salesConsultantId;
			const communityId = node.children[0].data.communityId;
			this.salesTallyService.getConsultantBuyers(salesConsultantId, communityId).subscribe((data: ConsultantBuyer[]) => {
				node.children = data.map(buyer => ({
					data: {
						name: `${buyer.customerFirstName} ${buyer.customerLastName} - ${buyer.lotBlock}`,
						pending: buyer.pending,
						currentSignups: 0,
						currentCancellations: 0,
						currentNet: 0,
						mtdSignups: 0,
						mtdCancellations: 0,
						mtdNet: 0,
						currentDayNetAdd: 0,
						previousDayNetAdd: 0
					},
					children: [],
					expanded: false
				}));

				this.areaSales = this.areaSales.slice();
			});
        }

        this.scrollToSelection(event.node);
    }

	scrollToSelection(selection) {
		function isEqual(treeNode: any, selectedNode: any) : boolean {
			if (treeNode.data.name === selectedNode.data.name) {
				if (treeNode.parent && selectedNode.parent) {
					return isEqual(treeNode.parent, selectedNode.parent);
				} else {
					return !treeNode.parent && !selectedNode.parent;
				}
			}

			return false;
		}

        if (this.salesTree.serializedValue !== null) {
			let index = this.salesTree.serializedValue.findIndex(x => {
				return isEqual(x.node, selection);
			});
            if (index > -1) {
                const selectedElement = document.getElementsByClassName('phd-stlly-name').item(index);
                if (selectedElement) {
                    selectedElement.scrollIntoView({ block: 'start' });
                }
            }
        }
	}

	onToggleTable(name: string) {
		if (this.isMobile) {
			switch (name) {
				case 'market':
					this.showTopMarkets = !this.showTopMarkets;
					break;
				case 'community':
					this.showTopCommunities = !this.showTopCommunities;
					break;
				case 'agent':
					this.showTopSalesConsultants = !this.showTopSalesConsultants;
					break;
			}
		}
	}
}
