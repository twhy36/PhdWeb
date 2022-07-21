import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { IOptionCommunity, IPlanCommunity } from '../../../shared/models/community.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { PlanOptionService } from '../../../core/services/plan-option.service';
import { UnsubscribeOnDestroy } from 'phd-common';
import { IMarket, IFinancialCommunity } from '../../../shared/models/community.model';
import { map } from 'rxjs/operators';
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

  packageInfoLoaded: boolean = false;
  currentPackage: IOptionPackage;
  currentPackageDivision: IMarket;
  currentPackageCommunity: IFinancialCommunity;

  currentFinancialCommunityId: number;
  planCommunityList$: Observable<Array<IPlanCommunity>>;
  selectedPlans: Array<number> = [];

  public isExpanded:boolean = false;
  expandedRows:{[s: string]: boolean;} = {};
  options:Array<IOptionCommunity> = [{
    id: 1,
    optionSalesName: "option 1",
    optionSubCategoryId: 1,
    planOptionCommunities: [{id: 11,
                            planId: 111,
                            isBaseHouse: false}]
  },
  {
    id: 315,
    optionSalesName: "option 315",
    optionSubCategoryId: 1,
    planOptionCommunities: [{id: 11,
                            planId: 111,
                            isBaseHouse: false}]
  },
  {
    id: 2,
    optionSalesName: "option 2",
    optionSubCategoryId: 2,
    planOptionCommunities: [{id: 22,
                            planId: 222,
                            isBaseHouse: false}]
  },
  {
    id: 3,
    optionSalesName: "option 3",
    optionSubCategoryId: 3,
    planOptionCommunities: [{id: 33,
                            planId: 333,
                            isBaseHouse: false}]
  },
  {
    id: 4,
    optionSalesName: "option 4",
    optionSubCategoryId: 4,
    planOptionCommunities: [{id: 44,
                            planId: 444,
                            isBaseHouse: false}]
  }];


  ngOnInit(): void {
    this._colorAdminService.emitEditingColor(true);
    const routeBundleId = parseInt(this.route.snapshot.paramMap.get('bundleId'));
    this.loadPackageInfo(routeBundleId);
    this.expandAllRows();
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
      }
    );
  }

  onLoadPlans() {

  }

  getCurrentPackageTitle(): string {
    if (this.packageInfoLoaded) {
      return `${this.currentPackage?.name} (${this.currentPackageDivision?.name} : ${this.currentPackageCommunity?.name} )`;
    }
    return `(Option Package Couldn't Be Loaded)`;
  }

  expandAllRows() {
    this.options.forEach(data =>{
      this.expandedRows[data.id] = true;
    })
  }

  collapseAllRows() {
    this.expandedRows={};
  }

}
