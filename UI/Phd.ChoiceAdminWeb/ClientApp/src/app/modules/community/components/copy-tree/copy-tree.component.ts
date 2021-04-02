import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, finalize } from 'rxjs/operators';

import * as moment from 'moment';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { Message } from 'primeng/api';

import { OrganizationService } from '../../../core/services/organization.service';
import { PlanService } from '../../../core/services/plan.service';
import { CopyTreeService, ITreeVersion } from '../../../core/services/copy-tree.service';

import { IFinancialMarket } from '../../../shared/models/financial-market.model';
import { IFinancialCommunity } from '../../../shared/models/financial-community.model';
import { IPlan } from '../../../shared/models/plan.model';
import { ConfirmModalComponent } from '../../../core/components/confirm-modal/confirm-modal.component';
import { IdentityService } from 'phd-common/services';
import { Permission } from 'phd-common/models';
import { of } from 'rxjs';

@Component({
	selector: 'copy-tree',
	templateUrl: './copy-tree.component.html',
	styleUrls: ['./copy-tree.component.scss']
})
export class CopyTreeComponent implements OnInit
{
	copyForm: FormGroup;
	hasLoaded: boolean = false;

	ddMarketFrom: DropDown = new DropDown('Market');
	ddCommunityFrom: DropDown = new DropDown('Community');
	ddPlanFrom: DropDown = new DropDown('Plan');
	ddTreeFrom: DropDown = new DropDown('Tree');

	ddMarketTo: DropDown = new DropDown('Market');
	ddCommunityTo: DropDown = new DropDown('Community');
	ddPlanTo: DropDown = new DropDown('Plan');

	saving: boolean = false;
	msgs: Message[] = [];
	treeVersionId: number = 0;
	originalTreeVersionId: number = 0;

	hasDivisionCatalogEdit: boolean = false;

	get canSave(): boolean
	{
		let canSave = this.copyForm.pristine || !this.copyForm.valid || this.saving;

		return canSave;
	}

	constructor(private _modalService: NgbModal, private _orgService: OrganizationService, private _planService: PlanService, private _copyTreeService: CopyTreeService, private _router: Router, private _identityService: IdentityService) { }

	ngOnInit()
	{
		this._identityService.hasClaimWithPermission('DivisionCatalog', Permission.Edit)
			.pipe(finalize(() =>
			{
				this.hasLoaded = true;
			})).subscribe(hasPermission =>
			{
				this.hasDivisionCatalogEdit = hasPermission;

				this.createForm();

				this.getMarkets();
			});
	}

	createForm()
	{
		this.copyForm = new FormGroup({
			'communityFrom': new FormControl(null, Validators.required),
			'planFrom': new FormControl(null, Validators.required),
			'treeFrom': new FormControl(null, Validators.required),
			'communityTo': new FormControl(null, Validators.required),
			'planTo': new FormControl(null, Validators.required)
		});

		if (this.hasDivisionCatalogEdit)
		{
			this.copyForm.addControl('marketFrom', new FormControl(null, Validators.required));
			this.copyForm.addControl('marketTo', new FormControl(null, Validators.required));
		}

		this.onChanges();
	}

	onChanges()
	{
		if (this.hasDivisionCatalogEdit)
		{
			this.onChangeMarketFrom();
			this.onChangeMarketTo();
		}

		this.onChangeCommunityFrom();
		this.onChangePlanFrom();
		this.onChangeCommunityTo();
	}

	onChangeMainMarketFrom()
	{
		let selectedMarketFrom = this.ddMarketFrom.selectedOption as IFinancialMarket;

		this.copyForm.get('communityFrom').setValue(null);
		this.copyForm.get('communityTo').setValue(null);

		if (selectedMarketFrom != null)
		{
			// set the storage.
			this._orgService.currentFinancialMarket = selectedMarketFrom.number;

			this.getCommunities(this.ddMarketFrom.selectedOption.id, this.ddMarketFrom.data.length, [this.ddCommunityFrom, this.ddCommunityTo]);
		}
		else
		{
			this.ddCommunityFrom.data = [];
			this.ddCommunityTo.data = [];
		}
	}

	onChangeMarketFrom()
	{
		this.copyForm.get('marketFrom').valueChanges.subscribe((value: IFinancialMarket) =>
		{
			this.copyForm.get('communityFrom').setValue(null);

			if (value != null)
			{
				this.getCommunities(value.id, this.ddMarketFrom.data.length, [this.ddCommunityFrom]);
			}
			else
			{
				this.ddCommunityFrom.data = [];
			}
		});
	}

	onChangeMarketTo()
	{
		this.copyForm.get('marketTo').valueChanges.subscribe((value: IFinancialMarket) =>
		{
			this.copyForm.get('communityTo').setValue(null);

			if (value != null)
			{
				if (this.hasDivisionCatalogEdit)
				{
					// set the storage.
					this._orgService.currentFinancialMarket = value.number;
				}

				this.getCommunities(value.id, this.ddMarketTo.data.length, [this.ddCommunityTo]);
			}
			else
			{
				this.ddCommunityTo.data = [];
			}
		});
	}

	onChangeCommunityFrom()
	{
		this.copyForm.get('communityFrom').valueChanges.subscribe((value: IFinancialCommunity) =>
		{
			this.copyForm.get('planFrom').setValue(null);

			if (value != null)
			{
				// set local storage 
				this._orgService.currentFinancialCommunity = value.number;

				this.getPlans(this.ddPlanFrom, value.id);
			}
			else
			{
				this.ddPlanFrom.data = [];
			}
		});
	}

	onChangePlanFrom()
	{
		this.copyForm.get('planFrom').valueChanges.subscribe((value: IPlan) =>
		{
			this.copyForm.controls['treeFrom'].setValue(null);

			if (value != null)
			{
				const community = this.copyForm.controls['communityFrom'].value as IFinancialCommunity;

				this.getTreeVersions(community.id, value.financialPlanIntegrationKey);
			}
			else
			{
				this.ddTreeFrom.data = [];
			}
		});
	}

	onChangeCommunityTo()
	{
		this.copyForm.get('communityTo').valueChanges.subscribe((value: IFinancialCommunity) =>
		{
			this.copyForm.get('planTo').setValue(null);

			if (value != null)
			{

				this.getPlans(this.ddPlanTo, value.id);
			}
			else
			{
				this.ddPlanTo.data = [];
			}
		});
	}

	getMarkets()
	{
		this.ddMarketFrom.hasLoaded = false;

		if (this.hasDivisionCatalogEdit)
		{
			this.ddMarketTo.hasLoaded = false;
		}

		this._orgService.getAssignedMarkets()
			.pipe(
				combineLatest(this.hasDivisionCatalogEdit ? this._orgService.getMarkets() : of([] as IFinancialMarket[])),
				finalize(() =>
				{
					this.ddMarketFrom.hasLoaded = true;

					if (this.hasDivisionCatalogEdit)
					{
						this.ddMarketTo.hasLoaded = true;
					}

				}))
			.subscribe(([assignedMarkets, allMarkets]) =>
			{
				const storedMarket = this._orgService.currentFinancialMarket;

				if (this.hasDivisionCatalogEdit)
				{
					this.ddMarketFrom.data = allMarkets;
					this.ddMarketTo.data = assignedMarkets;
				}
				else
				{
					this.ddMarketFrom.data = assignedMarkets;
				}

				// check for stored market.  If found try to set the current market to that value.
				// not doing this for Division Plan Copy
				if (storedMarket != null && assignedMarkets.some(mkt => mkt.number === storedMarket))
				{
					if (this.hasDivisionCatalogEdit)
					{
						let selectedMarket = assignedMarkets.find(x => x.number === storedMarket);

						this.copyForm.controls['marketTo'].setValue(selectedMarket);

						// load community
						this.getCommunities(selectedMarket.id, this.ddMarketTo.data.length, [this.ddCommunityTo]);
					}
					else
					{
						this.ddMarketFrom.selectedOption = assignedMarkets.find(x => x.number === storedMarket);

						// load both Communities since we're dealing with just one market.
						this.getCommunities(this.ddMarketFrom.selectedOption.id, this.ddMarketFrom.data.length, [this.ddCommunityFrom, this.ddCommunityTo]);
					}
				}
			});
	}

	/** Sets the community data for both communityFrom and communityTo.  Only communityFrom gets a default from storage */
	getCommunities(marketId: number, marketCount: number, ddCommunityList: DropDown[])
	{
		if (marketCount > 0)
		{
			ddCommunityList.map(c => c.hasLoaded = false);

			this._orgService.getCommunities(marketId)
				.pipe(finalize(() =>
				{
					ddCommunityList.map(c => c.hasLoaded = true);
				}))
				.subscribe(comm =>
				{
					// sort communities
					let communities = comm.sort((a, b) => a.name > b.name ? 1 : a.name < b.name ? -1 : 0);

					ddCommunityList.map(c => c.data = communities);

					// don't auto load for Division Plan Copy
					if (!this.hasDivisionCatalogEdit)
					{
						// look for a stored community
						const storedCommunity = this._orgService.currentFinancialCommunity;

						if (storedCommunity)
						{
							this.copyForm.controls['communityFrom'].setValue(communities.find(x => x.number == storedCommunity));
						}
					}
				});
		}
	}

	/**
	 * Get plan data for both planFrom and planTo
	 * @param ddPlan
	 * @param marketKey
	 * @param commKey
	 */
	getPlans(ddPlan: DropDown, commId: number)
	{
		ddPlan.hasLoaded = false;

		this._planService.getCommunityPlans(commId).subscribe(plans =>
		{
			ddPlan.data = plans;

			ddPlan.hasLoaded = true;
		});
	}

	/**
	 * Used to disable a planTo option if it matches the selected planFrom option.
	 * @param planToOption
	 */
	disablePlanOption(planToOption: IPlan): boolean
	{
		let disableOption = false;

		const communityTo = this.copyForm.get('communityTo').value as IFinancialCommunity;
		const communityFrom = this.copyForm.get('communityFrom').value as IFinancialCommunity;
		const planFrom = this.copyForm.get('planFrom').value as IPlan;
		const planTo = this.copyForm.get('planTo').value as IPlan;

		if (planFrom)
		{
			if (planToOption && communityTo && communityFrom && communityFrom.id == communityTo.id)
			{
				// look for a match 
				let hasMatch = this.ddPlanTo.data.findIndex(x => x.financialPlanIntegrationKey == planFrom.financialPlanIntegrationKey) != -1;

				// if there is a match, then disable it
				if (hasMatch && planFrom.financialPlanIntegrationKey == planToOption.financialPlanIntegrationKey)
				{
					disableOption = true;
				}

				// Deselect the option in planTo if selected by planFrom
				if (planTo && planFrom.financialPlanIntegrationKey == planTo.financialPlanIntegrationKey)
				{
					this.copyForm.get('planTo').setValue(null);
				}
			}
		}

		return disableOption;
	}

	getTreeVersions(commId: number, planKey: string)
	{
		this.ddTreeFrom.hasLoaded = false;

		this._copyTreeService.getTreeVersions(commId, planKey).subscribe(treeVersions =>
		{
			this.ddTreeFrom.data = treeVersions.sort((l, r) =>
			{
				return this.treeVersionSort(l, r);
			});

			this.ddTreeFrom.hasLoaded = true;
		});

	}

	treeVersionSort(l, r)
	{
		const lEffectiveDate = l.publishStartDate ? moment.utc(l.publishStartDate).local() : null;
		const rEffectiveDate = r.publishStartDate ? moment.utc(r.publishStartDate).local() : null;

		if (!lEffectiveDate)
		{
			return -1;
		}

		if (!rEffectiveDate)
		{
			return 1;
		}

		const left = lEffectiveDate, right = rEffectiveDate;

		if (left.isSame(right))
		{
			return 0;
		}

		return left.isBefore(right) ? 1 : -1;
	}

	treeDisplayName(tree: ITreeVersion): string
	{
		let text = '';
		let effectiveDate = tree.publishStartDate ? moment.utc(tree.publishStartDate).local() : null;

		if (effectiveDate == null)
		{
			text = `Draft - ${moment.utc(tree.lastModifiedDate).local().format('M/DD/YYYY')}`;
		}
		else
		{
			text = `${tree.dTreeVersionName} - ${effectiveDate.format('M/DD/YYYY h:mm A')}`;
		}

		return text;
	}

	onClickCancel()
	{
		this.copyForm.get('planTo').setValue(null);
		this.msgs = [];
	}

	toggleControls(disable: boolean)
	{
		Object.keys(this.copyForm.controls).forEach(key =>
		{
			const control = this.copyForm.get(key);

			if (disable)
			{
				control.disable({ onlySelf: true, emitEvent: false });
			}
			else
			{
				control.enable({ onlySelf: true, emitEvent: false });
			}
		});
	}

	onClickSave()
	{
		this.saving = true;

		this.clearResults();
		this.toggleControls(true);

		const commKey = this.copyForm.get('communityTo').value.id;
		const planKey = this.copyForm.get('planTo').value.financialPlanIntegrationKey;

		// check to see if the plan we're about to copy to has a active Draft
		this._copyTreeService.getDraftTreeVersionId(commKey, planKey).subscribe(treeVersionId =>
		{
			if (treeVersionId == 0)
			{
				// draft not found, copy away!
				this.copyVersion();
			}
			else
			{
				// active draft found, so we need to ask if they'd like to override 
				this.hasDraftMessage(treeVersionId);
			}
		},
		error =>
		{
			this.createMessage({ severity: 'error', summary: 'Draft Check', detail: 'There was an error while trying to check for a draft.' });

			this.reEnableForm();
		});
	}

	hasDraftMessage(treeVersionId: number)
	{
		let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = `The selected plan already has an active draft.<br /><br />Do you wish to override?`;
		confirm.componentInstance.defaultOption = 'Continue';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				this.overrideVersion(treeVersionId);
			}
			else
			{
				this.reEnableForm();
			}
		}, (reason) =>
		{

		});
	}

	clearResults()
	{
		this.msgs = []; // clear messages if any
		this.treeVersionId = 0;
		this.originalTreeVersionId = 0;
	}

	createMessage(msg: Message)
	{
		this.msgs = [];
		this.msgs.push(msg);
	}

	copyVersion()
	{
		this.createMessage({ severity: 'info', summary: 'Copy Tree', detail: 'Copying Tree...' });

		const treeVersionId = this.copyForm.get('treeFrom').value.dTreeVersionID;
		const commId = this.copyForm.get('communityTo').value.id;
		const planKey = this.copyForm.get('planTo').value.financialPlanIntegrationKey;

		this.originalTreeVersionId = treeVersionId;

		// copying tree from one plan to another
		this._copyTreeService.copyTreeVersionTo(commId, planKey, treeVersionId)
			.pipe(
				finalize(() => this.reEnableForm())
			)
			.subscribe(newTreeVersionId =>
			{
				this.treeVersionId = newTreeVersionId;

				if (newTreeVersionId != 0)
				{
					this.createMessage({ severity: 'success', summary: 'Copy Tree', detail: `The tree has been successfully copied.` });

					// clear out plan To value.
					this.copyForm.get('planTo').setValue(null);
				}
				else
				{
					this.createMessage({ severity: 'error', summary: 'Copy Tree', detail: 'There was an error while trying to copy the selected tree.' });
				}
			},
			error =>
			{
				this.createMessage({ severity: 'error', summary: 'Copy Tree', detail: 'There was an error while trying to copy the selected tree.' });
			});
	}

	navToTree(id)
	{
		this._router.navigate(['community', 'tree', id]);
	}

	overrideVersion(treeVersionId: number)
	{
		if (treeVersionId != 0)
		{
			this.createMessage({ severity: 'info', summary: 'Override Draft', detail: 'Deleting Draft...' });

			// delete the current draft
			this._copyTreeService.deleteDraftTreeVersion(treeVersionId)
				.subscribe(() =>
				{
					this.copyVersion();
				},
				error =>
				{
					this.createMessage({ severity: 'error', summary: 'Override Draft', detail: 'There was an issue trying to override the existing draft tree.' });

					this.reEnableForm();
				});
		}
		else
		{
			this.createMessage({ severity: 'error', summary: 'Override Draft', detail: 'There was an issue trying to override the existing draft tree.' });

			this.reEnableForm();
		}
	}

	reEnableForm()
	{
		this.toggleControls(false);
		this.saving = false;
	}

	getPlanCopyValidation()
	{
		this._copyTreeService.getPlanCopyValidation(this.originalTreeVersionId, this.treeVersionId).subscribe(xlsData =>
		{
			let formattedDate = moment(new Date()).format('M.DD.YYYY');

			const anchor = document.createElement('a');

			document.body.appendChild(anchor);

			anchor.href = xlsData;
			anchor.download = `Copy Plan Validation - ${formattedDate}.xlsx`;
			anchor.click();

			document.body.removeChild(anchor);

			window.URL.revokeObjectURL(xlsData);
		},
		error =>
		{
			this.createMessage({ severity: 'error', summary: 'Copy Plan Validation', detail: 'There was an issue trying to create the Copy Plan Validation document.' });
		});
	}
}

class DropDown
{
	hasLoaded: boolean = true;
	text: string = '';
	data: any[] = [];
	selectedOption: any;

	get defaultText()
	{
		return this.hasLoaded ? `Select a ${this.text}` : 'Loading...';
	}

	constructor(text: string)
	{
		this.text = text;
	}
}
