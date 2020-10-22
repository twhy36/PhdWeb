import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { OrganizationService } from '../../../core/services/organization.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { IMarket, IFinancialCommunity, ISalesCommunity } from '../../models/community.model';

@Component({
  selector: 'sales-community-selector',
  templateUrl: './sales-community-selector.component.html',
  styleUrls: ['./sales-community-selector.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class SalesCommunitySelectorComponent implements OnInit
{

  @Input() showFinancialCommunity: boolean = false;
  @Input() showSalesCommunity: boolean = true;
  @Input() showLabels: boolean = false;
  @Input() optionalFinancialCommunity = true;
  @Output() onMarketChange: EventEmitter<number> = new EventEmitter(true);
  @Output() onSalesCommunityChange: EventEmitter<number> = new EventEmitter(true);
  @Output() onFinancialCommunityChange: EventEmitter<number> = new EventEmitter(true);

  specHomesForm: FormGroup;
  marketsControl = new FormControl(null, Validators.required);
  communitiesControl = new FormControl(null, Validators.required);
  financialCommunitiesControl = new FormControl(null, Validators.required);

  selectedMarket: IMarket;
  selectedCommunity: ISalesCommunity;
  selectedFinancialCommunity: IFinancialCommunity;

  markets: Array<IMarket>;
  communities: Array<ISalesCommunity>;

  SALES_COMMUNITY_STATUS = {
    LOADING: 'Loading communities...',
    LOADED: 'Select Sales Community',
    EMPTY: '* No Sales Communities available'
  }

  FINANCIAL_COMMUNITY_STATUS = {
    WAITING: 'Loading Financial Communities...',
	READY_OPT: 'Financial Communities (optional)',
	READY: 'Financial Communities',
    EMPTY: '0 Financial Communities'
  }

  communityStatus: string;
  financialCommunityStatus: string;

  constructor(private _orgService: OrganizationService) { }

  ngOnInit()
  {
    this.financialCommunityStatus = this.FINANCIAL_COMMUNITY_STATUS.WAITING;
    this.createForm();
    this.setCommunitiesLoading();

    this._orgService.getMarkets().subscribe(markets =>
    {
      const storedMarket = this._orgService.currentFinancialMarket;

      this.markets = markets;

      // If storedMarket is not set, then we need to get the first market in the list.
      if (storedMarket == null)
      {
        this.selectedMarket = markets[0];
      } else
      {
        const foundMarket = markets.find(x => x.number === storedMarket);
        if (foundMarket)
        {
          this.selectedMarket = foundMarket;
        } else
        {
          this.selectedMarket = markets[0];
        }
      }

      this.onMarketChange.emit(this.selectedMarket.id);

      this.getCommunities();

    });
  }

  createForm()
  {
    this.specHomesForm = new FormGroup({
      'marketsControl': this.marketsControl,
      'communitiesControl': this.communitiesControl,
      'financialCommunitiesControl': this.financialCommunitiesControl
    });
  }

  getCommunities()
  {
    this.setCommunitiesLoading();

    if (this.selectedMarket && this.markets.length > 0)
    {
      this._orgService.getSalesCommunities(this.selectedMarket.id).subscribe(comm =>
      {
        // sort communities (do we need this? don't we sort via the API?)
        this.communities = comm.sort((a, b) => a.name > b.name ? 1 : a.name < b.name ? -1 : 0);

        // look for a stored sales community
        const storedCommunity = this._orgService.currentSalesCommunity;

        if (storedCommunity)
        {
          let community = this.communities.find(x => x.number == storedCommunity);
          if (!community)
          {
            community = this.communities[0];
          }
          this.selectedCommunity = community;
        } else
        {
          this.selectedCommunity = this.communities[0];
        }

        // SALES COMMUNITY UPDATES
        this.onSalesCommunityChange.emit(this.selectedCommunity.id);
        this.communityStatus = this.SALES_COMMUNITY_STATUS.LOADED;
        // enable controls for community selector
        this.communitiesControl.enable();
        this.setFinancialCommunity();
      });
    }
  }

  onChangeMarket()
  {
    // set local storage
    this._orgService.currentFinancialMarket = this.selectedMarket.number;
    // reset and get communities
    this.getCommunities();
    // send new market on up
    this.onMarketChange.emit(this.selectedMarket.id);
  }

  onChangeCommunity()
  {
    // set local storage
    this._orgService.currentSalesCommunity = this.selectedCommunity.number;
    // send new community on up
    this.onSalesCommunityChange.emit(this.selectedCommunity.id);
    this.setFinancialCommunity();
  }

  onChangeFinancialCommunity() {
    if (!this.selectedFinancialCommunity) {
      this._orgService.currentFinancialCommunity = null;
      this.onFinancialCommunityChange.emit(null);
    } else {
      // set local storage
      this._orgService.currentFinancialCommunity = this.selectedFinancialCommunity.number;
      // send new community on up
      this.onFinancialCommunityChange.emit(this.selectedFinancialCommunity.id);
    }
  }

  setCommunitiesLoading()
  {
    // Clear out selected sales community local storage if the selectedCommunity has already been set (otherwise we're loading for the first time)
    if (this.selectedCommunity)
    {
      this._orgService.currentSalesCommunity = null;
    }
    // Send on up
    this.onSalesCommunityChange.emit(null);
    // update text in first option in community select menu 
    this.communityStatus = this.SALES_COMMUNITY_STATUS.LOADING;
    // disable the select controls
    this.communitiesControl.disable();
    // reset community selected
    this.selectedCommunity = null;
    // get rid of commnunities in select menu
    this.communities = [];
    this.setFinancialCommunity();
  }

  setFinancialCommunity() 
  {
    //FINANCIAL COMMUNITY UPDATES
    if (this.showFinancialCommunity) 
    {
      this.selectedFinancialCommunity = null;
      // if there is not a selected community yet, then it is loading...
      if (!this.selectedCommunity) 
      {
        this.financialCommunityStatus = this.FINANCIAL_COMMUNITY_STATUS.WAITING;
        this.financialCommunitiesControl.disable();
        this.onFinancialCommunityChange.emit(null);
      }
      // once loaded, if it doesn't have any financial communities...
      else if (!this.selectedCommunity.financialCommunities.length) 
      {
        this.financialCommunitiesControl.disable();
        this.onFinancialCommunityChange.emit(null);
        this.financialCommunityStatus = this.FINANCIAL_COMMUNITY_STATUS.EMPTY;
      }
      // now loaded with financial communities...
      else 
      {
        // look for a stored financial community
        const storedFinancialCommunity = this._orgService.currentFinancialCommunity;
        if (storedFinancialCommunity) 
        {
          // the only time we would preset the financial community is when it is in local storage and it exists in the community list
          this.selectedFinancialCommunity = this.selectedCommunity.financialCommunities.find(x => x.number == storedFinancialCommunity) || null;
        }
        this.financialCommunitiesControl.enable();
        this.financialCommunityStatus = this.optionalFinancialCommunity ? this.FINANCIAL_COMMUNITY_STATUS.READY_OPT : this.FINANCIAL_COMMUNITY_STATUS.READY;

        // set local storage
        if (this.selectedFinancialCommunity) {
          this._orgService.currentFinancialCommunity = this.selectedFinancialCommunity.number;
          this.onFinancialCommunityChange.emit(this.selectedFinancialCommunity.id);
        }
      }
    }
  }
}
