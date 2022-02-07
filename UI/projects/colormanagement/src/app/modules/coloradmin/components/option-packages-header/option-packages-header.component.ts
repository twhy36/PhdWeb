import { Component, OnInit } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { IOptionPackage } from '../../../shared/models/optionpackage.model';
import { OptionPackageService } from '../../../core/services/option-packages.service';
import { SettingsService } from '../../../core/services/settings.service';
import { Settings } from '../../../shared/models/settings.model';
import { UnsubscribeOnDestroy } from 'phd-common';
import { OrganizationService } from '../../../core/services';
import { catchError, filter, switchMap, tap, map } from 'rxjs/operators';

@Component({
    selector:'option-packages-header',
    templateUrl:'option-packages-header.component.html',
    styleUrls: ['option-packages-header.component.scss']
})

export class OptionPackagesHeaderComponent
    extends UnsubscribeOnDestroy
    implements OnInit {

    //data
    commonPackages$: Observable<IOptionPackage[]>;  //the ui grid is binding to this with | async
    commonPackagesWIP: Array<IOptionPackage> = [];  //not sure we need this one... WIP for user changes to top grid
    communityPackages$: Observable<IOptionPackage[]>; //the ui grid is binding to this with | async
    communityPackagesWIP: Array<IOptionPackage> = []; //work in progress: user can change the sort order and rename

    //local
    errorMessage: string = "";
    settings: Settings;
    disableAddButton: boolean = true;
    sortCounter: number = 0;
    currentFinancialCommunityId: number;

    //html tables
    allDataLoaded: boolean;
	currentPage: number = 0;
	isLoading: boolean = true;
	skip: number;
    draggableRows: boolean = true;

    constructor(
        //various services we'll need
        private _optionPackageService: OptionPackageService,
        private _settingsService: SettingsService,
        private _orgService: OrganizationService)
        {
            //needed for UnsubscribeOnDestroy extension
            super();
        }

    ngOnInit(): void {
        //settings need for grids/divs
        this.settings = this._settingsService.getSettings();
        this._orgService.currentCommunity$.pipe(
            this.takeUntilDestroyed()
        ).subscribe(comm => this.currentFinancialCommunityId = comm.id);

        //go get the data
        this.loadData();
    }

    private loadData(){
        //wanted to go fully declarative here, but need the community id
        //and that was getting really messy

        //getting the current communityid and then piping the inner observable to populate the WIP array
        this.commonPackages$ = this._orgService.currentCommunity$.pipe(
            this.takeUntilDestroyed(),
            filter((comm) => !!comm),
            switchMap((comm) => {
                this.currentFinancialCommunityId = comm.id;
                return this._optionPackageService.getCommonPackages().pipe(
                    tap(items => items.map(item =>
                        this.commonPackagesWIP.push(item)
                    )),
                    catchError(err => {
                        this.errorMessage = err;
                        return EMPTY;
                    })
                )
            })
        )

        //getting the current communityid and then piping the inner observable to populate the WIP array
        //also updating the commonPackages array with data from the observable... which updates the commonPackages$
        //observable
        this.communityPackages$ = this._orgService.currentCommunity$.pipe(
            this.takeUntilDestroyed(),
            filter((comm) => !!comm),
            switchMap((comm) =>{
                this.currentFinancialCommunityId = comm.id;
                return this._optionPackageService.getCommunityPackages(this.currentFinancialCommunityId).pipe(
                    tap(items => items.map(item =>{
                        if (item.isCommon != 1){
                            //add item to working array - unless marked common
                            this.communityPackagesWIP.push(item);
                        }
                        this.commonPackagesWIP.forEach(itemB => {
                            //update the common working array where corrolated
                            if (item.bundleCommonId === itemB.bundleCommonId){
                                itemB.isCommon = 1;
                                itemB.presentationOrder = item.presentationOrder;
                                itemB.edhFinancialCommunityId = item.edhFinancialCommunityId;
                            }
                        })
                    })),
                    //filter out the common
                    map(items => items.filter(item => item.isCommon != 1)),
                    map(items => {
                        //return the resulting items
                        return [...items];
                    }),
                    catchError(err => {
                        this.errorMessage = err;
                        console.log("error loading common packages: ", this.errorMessage);
                        return EMPTY;
                    })
                )
            })
        )
    }

    getRowClass(rowData: any): string {
        //referrenced by phd-table to return a class name for formatting
        return null;
    }

    onPanelScroll(){
        //handles paging/scrolling - not sure we need it here
		this.isLoading = true;
		this.skip = this.currentPage * this.settings.infiniteScrollPageSize;
    }

    onRowReorder(event: any){

        //not sure here if we want to save as we go or all at once at the end
        //this will update the WIP array with the new sort order

        this.updateSort(this.communityPackagesWIP, event.dragIndex, event.dropIndex);
    }

    private updateSort(itemList: IOptionPackage[], oldIndex: number, newIndex: number){

        //stole this routine from contracts
        //Make sure list is sorted by sortOrder
		itemList.sort((left: IOptionPackage, right: IOptionPackage) =>
		{
			return left.presentationOrder === right.presentationOrder ? 0 : (left.presentationOrder < right.presentationOrder ? -1 : 1);
		});

		// Move the dragged element
		itemList.splice(newIndex, 0, itemList.splice(oldIndex, 1)[0]);

		// Update sortOrder
		let counter = -1;
		itemList.forEach(item =>
		{
			counter++;
			// If the sort order is changed add it to list to be updated
			if (item.presentationOrder != counter)
			{
				item.presentationOrder = counter
			}
		});
    }

    editPackage(currentRecord:IOptionPackage): void {
    }

    addPackage(): void{
    }

    renamePackage(currentRecord:IOptionPackage): void {
    }
}
