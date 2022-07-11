import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { IPlanCommunity } from '../../../shared/models/community.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { PlanOptionService } from '../../../core/services/plan-option.service';
import { UnsubscribeOnDestroy } from 'phd-common';
import { filter, map, switchMap } from 'rxjs/operators';
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
  
  isPackageLoaded:boolean = false;
  currentPackage:IOptionPackage;
  packageName:string = "";
  packageDivisionName:string = "";
  packageCommunityName:string = "";

  currentFinancialCommunityId: number;
  planCommunityList$: Observable<Array<IPlanCommunity>>;
	planCommunityList: Array<IPlanCommunity>;
  selectedPlans: Array<number> = [];

  ngOnInit(): void {
    this._colorAdminService.emitEditingColor(true);

      const routeBundleId = this.route.snapshot.paramMap.get('bundleId');
      
      // Loads Plans belonging to the current community, and sets the current financial community id
      this.planCommunityList$ = this._orgService.currentCommunity$.pipe(
        this.takeUntilDestroyed(),
        filter((comm) => !!comm),
        switchMap((comm) => {
          this.selectedPlans = [];
          this.currentFinancialCommunityId = comm.id;
          return this._planService.getPlanCommunities(this.currentFinancialCommunityId).pipe(
            map((plans) => {
              return plans;
            })
          )
        })
      );

      /**
       * #TODO: Load Current Option Package (The bundleID from the route can be used maybe?)
       *  - [ ] Assign values to packageName, packageDivisionName, and packageCommunityName
       *  - [ ] Handle errors in loading a package, or trying to load a package that doesn't exist
       *  - [ ] Set this.isPackageLoaded to the proper value
       */
  }

  ngOnDestroy(): void {
		this._colorAdminService.emitEditingColor(false);
	}

  onLoadPlans() {

	}

  getCurrentPackageInfo():string {
    // #TODO: Improve this method
    // - [ ] Maybe have a way to grab the package's division and community name instead?
    return (this.isPackageLoaded)      
        ?`${this.currentPackage.name} (${this.packageDivisionName} : ${this.packageCommunityName} )`
        :'(No Option Package Loaded)';
  }
}
