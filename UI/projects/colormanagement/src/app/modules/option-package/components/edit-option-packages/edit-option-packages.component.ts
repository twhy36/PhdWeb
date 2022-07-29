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

import { IMarket, IPlanCommunity } from '../../../shared/models/community.model';
import { IOptionPackage } from '../../../shared/models/optionpackage.model';
import { IOptionCategory, OptionPackageListItemDto } from '../../../shared/models/option.model';
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

  currentPackageTitle$:Observable<string>;
  planCommunityList$:Observable<Array<IPlanCommunity>>;
  currentPackage$:Observable<IOptionPackage>;
  optionPackageListOptions$:Observable<Array<OptionPackageListItemDto>>;

  optionCategoryList:IOptionCategory[] = [];
  selectedPlans:Array<number> = [];
  loadedPlans:Array<IPlanCommunity> = [];

  expandedRows:{[s:string]:boolean} = {};
  subcategoryOptionHeader:{[subCategoryId:string]:number}={}; // The number value will be the first option.id within the subCategory, used for displaying the subcategory
  planIndexOffset:number = 0; // This changes which plans are being displayed in the columns
  maxPlanColumns:number = 4;

  ngOnInit():void 
  {
    this._colorAdminService.emitEditingColor(true);
    this.currentPackage$ = this.route.paramMap.pipe(
      map((paramMap:ParamMap)=>+paramMap.get('bundleId'))).pipe(
        switchMap((routeBundleId:number)=>this._optionPackageService.getOptionPackage(routeBundleId).pipe(
          map((op:IOptionPackage)=>op))));
    
    // Loads plans in Community
    this.planCommunityList$ = this.currentPackage$.pipe(
      switchMap((op:IOptionPackage)=>this._planService.getPlanCommunities(op.edhFinancialCommunityId,true)))

    // Gets Package name and related Community and market
    this.currentPackageTitle$ = this.currentPackage$.pipe(
      switchMap((op:IOptionPackage)=>this._orgService.getMarket(op?.edhFinancialCommunityId).pipe(
        map((market)=>[market, op])
      )),
      map(([market,op]:[IMarket, IOptionPackage])=>{return `- ${op.name} (${market?.name} : ${market?.financialCommunities[0]?.name})`}));

    // Loads in the categories for the current community, used for collapsing groups
    this.currentPackage$.pipe(
      switchMap((op:IOptionPackage)=>
        this._optionService.getOptionPackageCategories(op.edhFinancialCommunityId)))
      .subscribe((categories:IOptionCategory[])=>this.optionCategoryList = categories)
  }

  ngOnDestroy():void 
  {
    this._colorAdminService.emitEditingColor(false);
  }

  onLoadPlans() 
  {
    this.planIndexOffset = 0;

    this.subcategoryOptionHeader = {};
    // Sets up subheaders
    this.optionPackageListOptions$ = this.currentPackage$.pipe(
      switchMap((op:IOptionPackage)=>this._planService.getOptionPackageListOptions(op.edhFinancialCommunityId,this.selectedPlans).pipe(
        map((optionList)=>{
          optionList.forEach((option)=>{if(!this.subcategoryOptionHeader[option.optionSubCategoryId])this.subcategoryOptionHeader[option.optionSubCategoryId]=option.id});
          return optionList;
        })
      ))
    );

    //Sets which plans are loaded in to the columns
    this.planCommunityList$.subscribe(
      (planCommunityList) =>  {
        this.loadedPlans = planCommunityList.filter(comm => this.selectedPlans.find(x => x === comm.id))
        this.loadedPlans.sort((a, b) => a.planSalesName.localeCompare(b.planSalesName));
      })

    this.expandAllRows();
  }

  onSavePlans()
  {

  }

  expandAllRows():void
  {
    this.optionCategoryList.forEach(data =>{
      this.expandedRows[data.id] = true;
    })
  }

  collapseAllRows():void
  {
    this.expandedRows={};
  }

  previousColumn():void
  {
    if(this.planIndexOffset!==0)this.planIndexOffset--;
  }
  
  nextColumn():void
  {
    if(this.planIndexOffset+this.maxPlanColumns!==this.loadedPlans.length)this.planIndexOffset++;
  }

  getOptionMaxQuantity(option:OptionPackageListItemDto, planId:number):number
  {
    return option.planOptionCommunities.find(x => x.planId === planId)?.maxOrderQty
  }
}
