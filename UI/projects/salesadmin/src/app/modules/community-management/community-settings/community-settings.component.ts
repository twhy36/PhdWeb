import { Component, OnInit } from '@angular/core';

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
export class CommunitySettingsComponent implements OnInit {

  public commTabs = Tabs;
  selectedTab = this.commTabs.MonotonyRules;

  constructor() { }

  ngOnInit(): void {
  }

  onTabClick(selectedTab: Tabs) {
    this.selectedTab = selectedTab;
  }

}
