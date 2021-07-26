import { Component, OnInit } from '@angular/core';
import { Claims, IdentityService } from 'phd-common';
import { take } from 'rxjs/operators';
import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';

enum Tabs {
  MonotonyRules = 'Monotony Rules',
  AutoApproval = 'Auto Approval',
  PDF = 'PDF Upload - Additional Info.',
  CommunitySettings = 'Community Settings'
}

@Component({
  selector: 'community-settings',
  templateUrl: './community-settings.component.html',
  styleUrls: ['./community-settings.component.css']
})
export class CommunitySettingsComponent extends UnsubscribeOnDestroy implements OnInit {

  public commTabs = Tabs;
  selectedTab: Tabs;

  get mainTitle(): string {
    return 'Community Settings > ' + this.selectedTab;
  }

  constructor(
    private identityService: IdentityService
  ) {
    super();
  }

  ngOnInit(): void {
    this.identityService.getClaims().pipe(
      take(1)
    ).subscribe(
      (claims: Claims) => {
        this.selectedTab = (!!claims.SalesAdmin) ? this.commTabs.MonotonyRules : this.commTabs.AutoApproval;
      }
    );
  }

  onTabClick(selectedTab: Tabs) {
    this.selectedTab = selectedTab;
  }

}
