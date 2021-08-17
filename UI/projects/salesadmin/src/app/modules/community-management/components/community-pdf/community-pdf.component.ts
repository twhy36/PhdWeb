import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { cloneDeep } from "lodash";
import { MessageService } from "primeng/api";
import { Observable, of } from "rxjs";
import { map, switchMap, tap } from "rxjs/operators";
import { CommunityService } from "../../../core/services/community.service";
import { OrganizationService } from "../../../core/services/organization.service";
import { CommunityPdf, SectionHeader } from "../../../shared/models/communityPdf.model";
import { FinancialCommunity } from "../../../shared/models/financialCommunity.model";
import { FinancialMarket } from "../../../shared/models/financialMarket.model";
import { FinancialCommunityViewModel } from "../../../shared/models/plan-assignment.model";
import { UnsubscribeOnDestroy } from "../../../shared/utils/unsubscribe-on-destroy";

@Component({
	selector: 'community-pdf',
	templateUrl: './community-pdf.component.html',
	styleUrls: ['./community-pdf.component.scss']
})
export class CommunityPdfComponent extends UnsubscribeOnDestroy implements OnInit
{
	private _selected: CommunityPdf;
	private _homeWarrantyPdfs: Array<CommunityPdf> = [];
	private _communityAssociationPdfs: Array<CommunityPdf> = [];
	private _additionalDocumentPdfs: Array<CommunityPdf> = [];
	selectedCommunity: FinancialCommunityViewModel = null;
	selectedMarket: FinancialMarket = null;
	filteredCommunityPdfs: Observable<Array<CommunityPdf>>;
	homeWarrantyPdfs: Array<CommunityPdf> = [];
	communityAssociationPdfs: Array<CommunityPdf> = [];
	additionalDocumentPdfs: Array<CommunityPdf> = [];
	isCanceling: boolean = false;
	isSorting: boolean = false;
	isSidePanelOpen: boolean = false;
	isSaving: boolean = false;
	isSortSaving: boolean = false;
	canManageDocument: boolean = true;
	canEdit: boolean = false;

	get selected(): CommunityPdf
	{
		return this._selected;
	}

	set selected(item: CommunityPdf)
	{
		this._selected = item;
	}

	constructor(public _orgService: OrganizationService,
		private _route: ActivatedRoute,
		private _communityService: CommunityService,
		private _msgService: MessageService) { super(); }

	ngOnInit()
	{
		this._orgService.currentMarket$.subscribe(mkt =>
		{
			this.selectedMarket = mkt;
			this.populateCommunityPdfs();
		});

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
		).subscribe(comm =>
		{
			if (comm != null)
			{
				if (!this.selectedCommunity || this.selectedCommunity.id != comm.id)
				{
					this.selectedCommunity = new FinancialCommunityViewModel(comm);
					this.populateCommunityPdfs();
				}
			}
			else
			{
				this.selectedCommunity = null;
			}
		});

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed(),
		).subscribe(canEdit => this.canEdit = canEdit);
	}

	populateCommunityPdfs()
	{
		if (this.selectedMarket !== null && this.selectedCommunity !== null)
		{
			this._communityService.getCommunityPdfsByFinancialCommunityId(this.selectedCommunity.dto.id)
			.subscribe(pdfs =>
			{
				// Populate each of the tree tables
				this.homeWarrantyPdfs = pdfs.filter(x => x.sectionHeader === SectionHeader.HomeWarranty);
				this.communityAssociationPdfs = pdfs.filter(x => x.sectionHeader === SectionHeader.CommunityAssociation);
				this.additionalDocumentPdfs = pdfs.filter(x => x.sectionHeader === SectionHeader.AdditionalDocuments);

				// Create a source of truth for when a sort edit is cancelled
				this._homeWarrantyPdfs = cloneDeep(this.homeWarrantyPdfs);
				this._communityAssociationPdfs = cloneDeep(this.communityAssociationPdfs);
				this._additionalDocumentPdfs = cloneDeep(this.additionalDocumentPdfs);
			});
		}
	}

	addPdf()
	{
		this.selected = null;
		this.isSidePanelOpen = true;
	}

	onEditClick(communityPdf: CommunityPdf)
	{
		this.selected = communityPdf;
		this.isSidePanelOpen = true;
	}

	onDeleteComplete(communityPdf: CommunityPdf)
	{
		switch(communityPdf.sectionHeader)
		{
			case SectionHeader.HomeWarranty:
				this.homeWarrantyPdfs = this.homeWarrantyPdfs.filter(pdf => pdf.fileName != communityPdf.fileName);
				this._homeWarrantyPdfs = cloneDeep(this.homeWarrantyPdfs);
				break;
			case SectionHeader.CommunityAssociation:
				this.communityAssociationPdfs = this.communityAssociationPdfs.filter(pdf => pdf.fileName != communityPdf.fileName);
				this._communityAssociationPdfs = cloneDeep(this.communityAssociationPdfs);
				break;
			case SectionHeader.AdditionalDocuments:
				this.additionalDocumentPdfs = this.additionalDocumentPdfs.filter(pdf => pdf.fileName != communityPdf.fileName);
				this._additionalDocumentPdfs = cloneDeep(this.additionalDocumentPdfs);
				break;
		}
	}

	onSortComplete(isComplete: boolean)
	{
		this.isSortSaving = false;
		if (isComplete)
		{
			this.editSort();
		}
	}

	onSidePanelClose(status: boolean)
	{
		this.isSidePanelOpen = status;
	}

	cancelSort()
	{
		this.editSort();
		// Sets any potential sorts back to their default
		this.homeWarrantyPdfs = cloneDeep(this._homeWarrantyPdfs);
		this.communityAssociationPdfs = cloneDeep(this._communityAssociationPdfs);
		this.additionalDocumentPdfs = cloneDeep(this._additionalDocumentPdfs);
		this.isCanceling = true;
	}

	editSort()
	{
		this.canManageDocument = !this.canManageDocument;
		this.isSorting = !this.isSorting;
		this.isCanceling = false;
	}

	saveSort()
	{
		this.isSortSaving = true;
		// Updates defaults to the new saved state
		this._homeWarrantyPdfs = cloneDeep(this.homeWarrantyPdfs);
		this._communityAssociationPdfs = cloneDeep(this.communityAssociationPdfs);
		this._additionalDocumentPdfs = cloneDeep(this.additionalDocumentPdfs);
	}

	save(formData: FormData)
	{
		formData.set('marketId', this.selectedMarket.id.toString());
		formData.set('financialCommunityId', this.selectedCommunity.dto.id.toString());
		formData.set('sortOrder', this.getSortOrder(parseInt(formData.get('sectionHeader').valueOf().toString()) as SectionHeader, formData.get('fileName').valueOf().toString()));

		this._communityService.saveCommunityPdf(formData)
			.subscribe(communityPdf =>
			{
			this.updatePdfLists(communityPdf);
			this.isSaving = false;
			this.isSidePanelOpen = false;
			this._msgService.add({ severity: 'success', summary: 'Community Pdf', detail: `has been uploaded!` });
			});
	}

	update(pdf: CommunityPdf)
	{
		pdf.marketId = this.selectedMarket.id;
		pdf.financialCommunityId = this.selectedCommunity.dto.id;
		this._communityService.updateCommunityPdfs([pdf])
			.subscribe(communityPdfs =>
			{
				communityPdfs.forEach(pdf => this.updatePdfLists(pdf));
				this.isSaving = false;
				this.isSidePanelOpen = false;
				this._msgService.add({ severity: 'success', summary: 'Community Pdf', detail: `has been updated!` });
			})
	}

	private updatePdfLists(communityPdf: CommunityPdf)
	{
		switch(communityPdf.sectionHeader)
		{
			case SectionHeader.HomeWarranty:
				this.homeWarrantyPdfs = this.homeWarrantyPdfs.filter(pdf => pdf.fileName != communityPdf.fileName);
				this.homeWarrantyPdfs.push(communityPdf);
				this._homeWarrantyPdfs = cloneDeep(this.homeWarrantyPdfs);
				break;
			case SectionHeader.CommunityAssociation:
				this.communityAssociationPdfs = this.communityAssociationPdfs.filter(pdf => pdf.fileName != communityPdf.fileName);
				this.communityAssociationPdfs.push(communityPdf);
				this._communityAssociationPdfs = cloneDeep(this.communityAssociationPdfs);
				break;
			case SectionHeader.AdditionalDocuments:
				this.additionalDocumentPdfs = this.additionalDocumentPdfs.filter(pdf => pdf.fileName != communityPdf.fileName);
				this.additionalDocumentPdfs.push(communityPdf);
				this._additionalDocumentPdfs = cloneDeep(this.additionalDocumentPdfs);
				break;
		}
	}

	private getSortOrder(sectionHeader: SectionHeader, fileName: string): string
	{
		switch(sectionHeader)
		{
			case SectionHeader.HomeWarranty:
			const homePdf = this.homeWarrantyPdfs.find(pdf => pdf.fileName === fileName);
			return (homePdf?.sortOrder ?? this.homeWarrantyPdfs.length + 1).toString();
			case SectionHeader.CommunityAssociation:
			const commPdf = this.communityAssociationPdfs.find(pdf => pdf.fileName === fileName);
			return (commPdf?.sortOrder ?? this.communityAssociationPdfs.length + 1).toString();
			case SectionHeader.AdditionalDocuments:
			const addPdf = this.additionalDocumentPdfs.find(pdf => pdf.fileName === fileName);
			return (addPdf?.sortOrder ?? this.additionalDocumentPdfs.length + 1).toString();
		}
	}
}