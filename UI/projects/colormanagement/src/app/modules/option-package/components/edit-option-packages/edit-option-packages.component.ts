import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UnsubscribeOnDestroy } from 'phd-common';

import { ColorAdminService } from '../../../core/services/color-admin.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { OptionService } from '../../../core/services/option.service';
import { OptionPackageService } from '../../../core/services/option-packages.service';
import { PlanOptionService } from '../../../core/services/plan-option.service';

import { IMarket, IFinancialCommunity, IOptionCommunity, IPlanCommunity } from '../../../shared/models/community.model';
import { IOptionPackage } from '../../../shared/models/optionpackage.model';
import { IOptionSubCategory, IOptionCategory } from '../../../shared/models/option.model';

@Component({
  selector: 'edit-option-packages',
  templateUrl: './edit-option-packages.component.html',
  styleUrls: ['./edit-option-packages.component.scss']
})
export class EditOptionPackagesComponent extends UnsubscribeOnDestroy
  implements OnInit {

  constructor(
    private _optionPackageService: OptionPackageService,
    private route: ActivatedRoute,
    private _planService: PlanOptionService,
    private _orgService: OrganizationService,
    private _optionService: OptionService,
    private _colorAdminService: ColorAdminService
  ) {
    super();
  }

  packageInfoLoaded: boolean = false;
  currentPackage: IOptionPackage;
  currentPackageDivision: IMarket;
  currentPackageCommunity: IFinancialCommunity;

  currentFinancialCommunityId: number;
  planCommunityList$: Observable<Array<IPlanCommunity>>;
  planCommunityList: Array<IPlanCommunity>;
  selectedPlans: Array<number> = [];
  loadedPlans:Array<IPlanCommunity> = [];

  public isExpanded:boolean = false;
  expandedRows:{[s: string]: boolean;} = {};
  planIndexOffset:number = 0; // This changes which plans are being displayed
  maxPlanColumns:number = 4;

  optionSubcategoryList$:Observable<IOptionSubCategory[]>;
  optionSubcategoryList:IOptionSubCategory[];
  optionCategoryList:IOptionCategory[];
  selectedPlansOptionList: Array<IOptionCommunity> = [];


  ngOnInit(): void {
    this._colorAdminService.emitEditingColor(true);
    const routeBundleId = parseInt(this.route.snapshot.paramMap.get('bundleId'));
    this.loadPackageInfo(routeBundleId);    
  }

  ngOnDestroy(): void {
    this._colorAdminService.emitEditingColor(false);
  }

  private loadPackageInfo(routeBundleId: number) {
    // Load's the current package, it's related Plans, Community and Market/Division
    this._optionPackageService.getOptionPackage(routeBundleId).subscribe(
      (op) => {
        if (!op[0]) {
          return;
        }
        this.currentPackage = op[0];
        this.currentFinancialCommunityId = this.currentPackage.edhFinancialCommunityId;

        // Loads the package's related plans
        this.planCommunityList$ = this._planService.getPlanCommunities(this.currentFinancialCommunityId).pipe(
          map((plans) => {
            this.planCommunityList = plans;
            return plans;
          })
        )

        // Loads the package's related market/division and community
        this._orgService.getMarket(this.currentFinancialCommunityId).subscribe(
          (market) => {
            this.currentPackageDivision = market[0];
            this.currentPackageCommunity = market[0]?.financialCommunities[0];
            this.packageInfoLoaded = (this.currentPackageDivision !== undefined && this.currentPackageCommunity !== undefined);
          }
        )

        // Loads option sub categories
        this._optionService.getOptionsCategorySubcategory(this.currentFinancialCommunityId).subscribe(
          (OptionsCategorySubcategories) => {
            // this.optionCategoryList = OptionsCategorySubcategories.map(subCat=>subCat.optionCategory);
            this.optionCategoryList = [];
            OptionsCategorySubcategories.forEach(subCat=>{
                if(!this.optionCategoryList.find(x => x.id === subCat.optionCategory.id)){
                  this.optionCategoryList.push(subCat.optionCategory);
                }});
            return this.optionSubcategoryList = OptionsCategorySubcategories;
          }
        )
      }
    );
  }

  onLoadPlans() {
    this.planIndexOffset = 0;
    this.loadedPlans = this.planCommunityList.filter(comm => this.selectedPlans.find(x => x === comm.id));
    this.loadedPlans.sort((a, b) => a.planSalesName.localeCompare(b.planSalesName));

    if(this.selectedPlans.length === 0 || !this.packageInfoLoaded){
      this.selectedPlansOptionList = [];
      return;
    }

    // Loads the options for the selected plans
    this._planService
			.getPlanOptions(this.currentFinancialCommunityId, this.selectedPlans)
			.subscribe((options) =>
			{
				this.selectedPlansOptionList = options;
        this.expandAllRows();
			});
  }

  onSavePlans(){

  }

  getCurrentPackageTitle(): string {
    if (this.packageInfoLoaded) {
      return `${this.currentPackage?.name} (${this.currentPackageDivision?.name} : ${this.currentPackageCommunity?.name} )`;
    }
    return `(Option Package Couldn't Be Loaded)`;
  }

  expandAllRows() {
    this.optionSubcategoryList.forEach(data =>{
      this.expandedRows[data.id] = true;
    })
    this.optionCategoryList.forEach(data =>{
      this.expandedRows[data.id] = true;
    })
  }

  collapseAllRows() {
    this.expandedRows={};
  }

  previousColumn() {
    if(this.planIndexOffset!==0)this.planIndexOffset--;
  }
  
  nextColumn() {
    if(this.planIndexOffset+this.maxPlanColumns!==this.loadedPlans.length)this.planIndexOffset++;
  }

  optionStatus(option:IOptionCommunity, planId:number): string{
    // TODO: Add a way to check which type of entry field an option should be 
    if (option.planOptionCommunities.filter(optionPlan => optionPlan.planId === planId).length > 0) {
      return 'checkbox';    
    }
    return 'disabled';
  }

  subCategoryHeader(subCategoryId:number):string{
    return this.optionSubcategoryList.find(x => x.id === subCategoryId).name;
  }

  categoryHeader(subCategoryId:number):string{
    return this.optionSubcategoryList.find(x => x.id === subCategoryId)?.optionCategory.name;
  }

  getPlanName(communityId:number):string{
    return this.planCommunityList.find(x => x.id === communityId).planSalesName;
  }
}
