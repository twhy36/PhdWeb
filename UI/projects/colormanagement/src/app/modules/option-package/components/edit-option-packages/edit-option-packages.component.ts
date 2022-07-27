import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { UnsubscribeOnDestroy } from 'phd-common';

import { ColorAdminService } from '../../../core/services/color-admin.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { OptionService } from '../../../core/services/option.service';
import { OptionPackageService } from '../../../core/services/option-packages.service';
import { PlanOptionService } from '../../../core/services/plan-option.service';

import { IMarket, IOptionCommunity, IPlanCommunity } from '../../../shared/models/community.model';
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

  currentPackageTitle$: Observable<string>;
  planCommunityList$: Observable<Array<IPlanCommunity>>;

  selectedPlans: Array<number> = [];
  loadedPlans:Array<IPlanCommunity> = [];

  public isExpanded:boolean = false;
  expandedRows:{[s: string]: boolean;} = {};
  planIndexOffset:number = 0; // This changes which plans are being displayed in the columns
  maxPlanColumns:number = 4;

  optionSubcategoryList:IOptionSubCategory[];
  optionCategoryList:IOptionCategory[];
  selectedPlansOptionList$: Observable<Array<IOptionCommunity>>;


  ngOnInit(): void {
    this._colorAdminService.emitEditingColor(true);
    const routeBundleId = parseInt(this.route.snapshot.paramMap.get('bundleId'));
    // this.loadPackageInfo(routeBundleId);    
    const routeBundleId$ = this.route.paramMap.pipe(map((paramMap:ParamMap)=>+paramMap.get('bundleId')));
    
    // Loads plans
    this.planCommunityList$ = routeBundleId$.pipe(
      switchMap((routeBundleId:number)=>this._optionPackageService.getOptionPackage(routeBundleId).pipe(
        map((optionPackage:IOptionPackage)=>optionPackage?.edhFinancialCommunityId))),
      switchMap((edhFinancialCommunityId:number)=>this._planService.getPlanCommunities(edhFinancialCommunityId))
    );

    // Gets Package name and related Community and market
    this.currentPackageTitle$ = routeBundleId$.pipe(
      switchMap((routeBundleId:number)=>this._optionPackageService.getOptionPackage(routeBundleId)),
      switchMap((optionPackage:IOptionPackage)=>this._orgService.getMarket(optionPackage?.edhFinancialCommunityId).pipe(
        map((market)=>[market, optionPackage])
      )),
      map(([market,optionPackage]:[IMarket, IOptionPackage])=>{return `- ${optionPackage.name} (${market?.name} : ${market?.financialCommunities[0]?.name})`})
    );

    // Loads opion subCategories and Categories
    // TODO: Add a getOptionsCategory method   
    routeBundleId$.pipe(
      switchMap((routeBundleId:number)=>this._optionPackageService.getOptionPackage(routeBundleId).pipe(
        map((optionPackage:IOptionPackage)=>optionPackage?.edhFinancialCommunityId))),
      switchMap((edhFinancialCommunityId:number)=>this._optionService.getOptionsCategorySubcategory(edhFinancialCommunityId))
    ).subscribe(
      (OptionsCategorySubcategories:IOptionSubCategory[]) => {
        this.optionCategoryList = [];
        OptionsCategorySubcategories.forEach(subCat=>{
            if(!this.optionCategoryList.find(x => x.id === subCat.optionCategory.id)){
              this.optionCategoryList.push(subCat.optionCategory);
            }});
            console.log(this.optionCategoryList);
        return this.optionSubcategoryList = OptionsCategorySubcategories;
      }
    );
  }

  ngOnDestroy(): void {
    this._colorAdminService.emitEditingColor(false);
  }


  onLoadPlans() {
    const routeBundleId$ = this.route.paramMap.pipe(map((paramMap:ParamMap)=>+paramMap.get('bundleId')));
    this.planIndexOffset = 0;

    
    if(this.selectedPlans.length === 0)
    {
      this.selectedPlansOptionList$ = null;
      return;
    }

    // Sets which plans are loaded in to the columns
    this.planCommunityList$.subscribe(
      (planCommunityList) =>  {
        this.loadedPlans = planCommunityList.filter(comm => this.selectedPlans.find(x => x === comm.id))
        this.loadedPlans.sort((a, b) => a.planSalesName.localeCompare(b.planSalesName));
      }
    )

    // Loads the options for the selected plans
    this.selectedPlansOptionList$ = routeBundleId$.pipe(
      switchMap((routeBundleId:number)=>this._optionPackageService.getOptionPackage(routeBundleId).pipe(
        map((optionPackage:IOptionPackage)=>optionPackage?.edhFinancialCommunityId))),
      switchMap((edhFinancialCommunityId:number)=>this._planService.getPlanOptions(edhFinancialCommunityId,this.selectedPlans))
    );

    this.expandAllRows();
  }

  onSavePlans(){

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

  // TODO: Remove these and add a better method of retreiving names
  subCategoryHeader(subCategoryId:number):string{
    return this.optionSubcategoryList.find(x => x.id === subCategoryId).name;
  }

  categoryHeader(subCategoryId:number):string{
    return this.optionSubcategoryList.find(x => x.id === subCategoryId)?.optionCategory.name;
  }

}
