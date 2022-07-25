import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { NEVER, Observable } from 'rxjs';
import { IPlanCommunity } from '../../../shared/models/community.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { PlanOptionService } from '../../../core/services/plan-option.service';
import { UnsubscribeOnDestroy } from 'phd-common';
import { IMarket, IFinancialCommunity } from '../../../shared/models/community.model';
import { map, switchMap } from 'rxjs/operators';
import { IOptionPackage } from '../../../shared/models/optionpackage.model';
import { OptionPackageService } from '../../../core/services/option-packages.service';
import { ColorAdminService } from '../../../core/services/color-admin.service';

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
    private _colorAdminService: ColorAdminService
  ) {
    super();
  }

  currentPackageTitle$: Observable<string>;
  planCommunityList$: Observable<Array<IPlanCommunity>>;
  selectedPlans: Array<number> = [];

  ngOnInit(): void {
    this._colorAdminService.emitEditingColor(true);
    const routeBundleId$ = this.route.paramMap.pipe(map((paramMap:ParamMap)=>+paramMap.get('bundleId')));
    
    this.planCommunityList$ = routeBundleId$.pipe(
      switchMap((routeBundleId:number)=>this._optionPackageService.getOptionPackage(routeBundleId).pipe(
        map((optionPackage:IOptionPackage)=>optionPackage?.edhFinancialCommunityId))),
      switchMap((edhFinancialCommunityId:number)=>this._planService.getPlanCommunities(edhFinancialCommunityId))
      );

    this.currentPackageTitle$ = routeBundleId$.pipe(
      switchMap((routeBundleId:number)=>this._optionPackageService.getOptionPackage(routeBundleId)),
      switchMap((optionPackage:IOptionPackage)=>this._orgService.getMarket(optionPackage?.edhFinancialCommunityId).pipe(
        map((market)=>[market, optionPackage])
      )),
      map(([market,optionPackage]:[IMarket, IOptionPackage])=>{return `- ${optionPackage.name} (${market?.name} : ${market?.financialCommunities[0]?.name})`})
    );
  }

  ngOnDestroy(): void {
    this._colorAdminService.emitEditingColor(false);
  }

  onLoadPlans() {

  }
}
