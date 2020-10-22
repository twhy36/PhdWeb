import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';
import { Observable, forkJoin, from, of } from 'rxjs';
import { concatMap, exhaustMap, switchMap, catchError, withLatestFrom, map, take, tap, combineLatest, concat, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { SalesAgreementService } from '../../core/services/sales-agreement.service';
import { ChangeOrderService } from '../../core/services/change-order.service';
import { ContractService } from '../../core/services/contract.service';

import * as JobActions from '../job/actions';
import * as ChangeOrderActions from '../change-order/actions';
import * as CommonActions from '../actions';

import
{
	SalesAgreementOutForSignature, SalesAgreementActionTypes, UpdateSalesAgreement, SalesAgreementSaved, SaveError,
	CreateSalesAgreementForScenario, SalesAgreementCreated, LoadBuyers, BuyersLoaded, SetTrustName, SwapPrimaryBuyer, AddCoBuyer, CoBuyerAdded,
	BuyersSwapped, DeleteCoBuyer, CoBuyerDeleted, UpdatePrimaryBuyer, UpdateCoBuyer, AddUpdateRealtor, RealtorSaved, ReSortCoBuyers, BuyerSaved, SalesAgreementLoadError,
	CoBuyersReSorted, TrustNameSaved, LoadRealtor, RealtorLoaded, DeleteProgram, ProgramSaved, SaveProgram, ProgramDeleted, SaveDeposit, DeleteDeposit, DepositSaved,
	DepositDeleted, DeleteContingency, ContingencyDeleted, SaveContingency, ContingencySaved, SaveNote, NoteDeleted, NoteSaved, DeleteNote, VoidSalesAgreement,
	SignSalesAgreement, ApproveSalesAgreement, CreateJIOForSpec, JIOForSpecCreated, SetIsFloorplanFlippedAgreement, IsFloorplanFlippedAgreement,
	CancelSalesAgreement, LoadConsultants, ConsultantsLoaded, SaveSalesConsultants, SalesConsultantsSaved, SaveSalesAgreementInfoNA, SalesAgreementInfoNASaved
} from './actions';
import { DeleteScenarioInfo, LotConflict } from '../scenario/actions';
import { OpportunityContactAssocUpdated } from '../opportunity/actions';

import * as fromRoot from '../reducers';
import * as fromSalesAgreement from './reducer';

import { Buyer } from '../../shared/models/buyer.model';
import { SalesAgreementInfo, SalesAgreementProgram, SalesAgreementContingency, SalesAgreement } from '../../shared/models/sales-agreement.model';
import { Job } from '../../shared/models/job.model';
import { SalesStatusEnum } from '../../shared/models/job-change-order.model';
import { ESignEnvelope, ESignStatusEnum, ESignTypeEnum } from '../../shared/models/esign-envelope.model';

import { tryCatch } from '../error.action';
import { SalesAgreementCancelled, LoadSpec } from '../actions';
import { TemplatesLoaded, CreateEnvelope } from '../contract/actions';
import { SpinnerService } from 'phd-common/services/spinner.service';

@Injectable()
export class SalesAgreementEffects
{
	@Effect()
	createSalesAgreement$: Observable<Action> = this.actions$.pipe(
		ofType<CreateSalesAgreementForScenario>(SalesAgreementActionTypes.CreateSalesAgreementForScenario),
		withLatestFrom(this.store, this.store.pipe(select(fromRoot.priceBreakdown))),
		exhaustMap(([action, store, priceBreakdown]) =>
		{
			// start spinner
			this.spinnerService.showSpinner(true);

			const isSpecSale = store.job && store.job.lot ? store.job.lot.lotBuildTypeDesc === 'Spec' : false;
			let salePrice = priceBreakdown.totalPrice;

			// remove estimates from the salePrice
			salePrice = priceBreakdown.homesiteEstimate > 0 ? salePrice - priceBreakdown.homesiteEstimate : salePrice;
			salePrice = priceBreakdown.designEstimate > 0 ? salePrice - priceBreakdown.designEstimate : salePrice;
			salePrice = priceBreakdown.salesProgram > 0 ? salePrice + priceBreakdown.salesProgram : salePrice;
			salePrice = priceBreakdown.priceAdjustments > 0 ? salePrice + priceBreakdown.priceAdjustments : salePrice;

			return this.salesAgreementService.createSalesAgreementForScenario(store.scenario.scenario, store.scenario.tree, store.scenario.options.find(o => o.isBaseHouse), salePrice).pipe(
				combineLatest(//fetch contract templates
					this.contractService.getTemplates(store.org.salesCommunity.market.id, store.scenario.tree.financialCommunityId).pipe(
						map(templates => [...templates, { displayName: "JIO", displayOrder: 2, documentName: "JIO", templateId: 0, templateTypeId: 4, marketId: 0, version: 0 }]),
					)),
				tap(([sag]) => this.router.navigateByUrl('/point-of-sale/people/' + sag.id)),
				switchMap(([salesAgreement, templates]) =>
				{
					let actions: any[] = [
						new SalesAgreementCreated(salesAgreement),
						new DeleteScenarioInfo(),
						new LoadConsultants(salesAgreement.id),
						new LoadRealtor(salesAgreement.id),
						new TemplatesLoaded(templates)
					];

					if (!isSpecSale)
					{
						actions.push(new LoadBuyers(salesAgreement.id));
					}

					return from(actions);
				}),
				catchError(error =>
				{
					if (error.error.Message === 'Lot Unavailable')
					{
						return of(new LotConflict());
					}

					return of(new SaveError(error));
				}),
				finalize(() =>
				{
					// stop spinner
					this.spinnerService.showSpinner(false);
				})
			);
		}
		)
	);

	@Effect()
	loadBuyers$: Observable<Action> = this.actions$.pipe(
		ofType<LoadBuyers>(SalesAgreementActionTypes.LoadBuyers),
		tryCatch(source => source.pipe(
			switchMap(action => this.salesAgreementService.getSalesAgreementBuyers(action.salesAgreementId)),
			switchMap(buyers => of(new BuyersLoaded(buyers)))
		), SalesAgreementLoadError, "Error loading buyers!!")
	);

	@Effect()
	loadConsultants: Observable<Action> = this.actions$.pipe(
		ofType<LoadConsultants>(SalesAgreementActionTypes.LoadConsultants),
		tryCatch(source => source.pipe(
			switchMap(action => this.salesAgreementService.getSalesAgreementConsultants(action.salesAgreementId)),
			switchMap(consultants => of(new ConsultantsLoaded(consultants)))
		), SalesAgreementLoadError, "Error loading consultants!!")
	);

	@Effect()
	loadRealtor$: Observable<Action> = this.actions$.pipe(
		ofType<LoadRealtor>(SalesAgreementActionTypes.LoadRealtor),
		tryCatch(source => source.pipe(
			switchMap(action => this.salesAgreementService.getSalesAgreementRealtor(action.salesAgreementId)),
			switchMap(realtor => of(new RealtorLoaded(realtor)))
		), SalesAgreementLoadError, "Error loading realtor!!")
	);

	@Effect()
	saveTrust$: Observable<Action> = this.actions$.pipe(
		ofType<SetTrustName>(SalesAgreementActionTypes.SetTrustName),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) => this.salesAgreementService.updateSalesAgreement({ id: store.salesAgreement.id, trustName: action.trustName })),
			switchMap(salesAgreement => of(new TrustNameSaved(salesAgreement.trustName)))
		), SaveError, "Error saving trust!!")
	);

	@Effect()
	updateSalesAgreement$: Observable<Action> = this.actions$.pipe(
		ofType<UpdateSalesAgreement>(SalesAgreementActionTypes.UpdateSalesAgreement),
		withLatestFrom(this.store.pipe(select(fromRoot.priceBreakdown))),
		tryCatch(source => source.pipe(
			switchMap(([action, priceBreakdown]) =>
			{
				const sa = new SalesAgreement(action.salesAgreement);

				if (sa.status == 'Pending' || sa.status == 'OutforSignature')
				{
					sa.salePrice = priceBreakdown.totalPrice;
				}

				return this.salesAgreementService.updateSalesAgreement(sa);
			}),
			switchMap(salesAgreement => of(new SalesAgreementSaved(salesAgreement)))
		), SaveError, 'Error updating sales agreement!!')
	);

	@Effect()
	saveSalesAgreementInfoNA: Observable<Action> = this.actions$.pipe(
		ofType<SaveSalesAgreementInfoNA>(SalesAgreementActionTypes.SaveSalesAgreementInfoNA),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const info: SalesAgreementInfo = new SalesAgreementInfo(action.salesAgreementInfo);

				info.edhSalesAgreementId = store.salesAgreement.id;

				return forkJoin(of(action), this.salesAgreementService.saveSalesAgreementInfo(info));
			}),
			switchMap(([action, info]) =>
			{
				return of(new SalesAgreementInfoNASaved(info, action.naType));
			})
		), SaveError, 'Error saving sales agreement info NA!!')
	);

	@Effect()
	saveIsFloorplanFlippedAgreement$: Observable<Action> = this.actions$.pipe(
		ofType<SetIsFloorplanFlippedAgreement>(SalesAgreementActionTypes.SetIsFloorplanFlippedAgreement),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const currentFlip: boolean = store.salesAgreement.isFloorplanFlipped;
				const info: SalesAgreementInfo = { edhSalesAgreementId: store.salesAgreement.id, isFloorplanFlipped: action.isFlipped };

				if (!!store.salesAgreement.id && store.salesAgreement.isFloorplanFlipped !== action.isFlipped)
				{
					return this.salesAgreementService.saveSalesAgreementInfo(info);
				}

				info.isFloorplanFlipped = currentFlip;

				return of(info);
			}),
			switchMap(info => of(new IsFloorplanFlippedAgreement(info.isFloorplanFlipped)))
		), SaveError, "Error saving floorplan flipped!!")
	);

	/*
	 * Deletes Co-Buyer
	 */
	@Effect()
	deleteCoBuyer: Observable<Action> = this.actions$.pipe(
		ofType<DeleteCoBuyer>(SalesAgreementActionTypes.DeleteCoBuyer),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const salesAgreementId = store.salesAgreement.id;

				return this.salesAgreementService.deleteBuyer(salesAgreementId, action.coBuyer.id).pipe(
					map(id =>
					{
						return { deletedCoBuyerId: id, sortKey: action.coBuyer.sortKey }
					}));
			}),
			switchMap(result =>
			{
				return of(new CoBuyerDeleted(result.deletedCoBuyerId, result.sortKey));
			})
		), SaveError, "Error deleting co-buyers!!")
	);

	/*
	 * Re-Sorts Co-Buyers after deletion for Co-Buyers with a Sort Key > Deleted Co-Buyer Sort Key
	 */
	@Effect()
	coBuyerDeleted: Observable<Action> = this.actions$.pipe(
		ofType<CoBuyerDeleted>(SalesAgreementActionTypes.CoBuyerDeleted),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const salesAgreementId = store.salesAgreement.id;
				const coBuyersToReSort = _.cloneDeep(store.salesAgreement.buyers.filter(b => b.sortKey > action.deletedCoBuyerSortKey));

				coBuyersToReSort.forEach(b => b.sortKey--);

				return this.salesAgreementService.saveReSortedBuyers(salesAgreementId, coBuyersToReSort);
			}),
			switchMap(updatedBuyers =>
			{
				return of(new CoBuyersReSorted(updatedBuyers));
			})
		), SaveError, "Error re-sorting co-buyers!!")
	);

	@Effect()
	updatePrimaryBuyer: Observable<Action> = this.actions$.pipe(
		ofType<UpdatePrimaryBuyer>(SalesAgreementActionTypes.UpdatePrimaryBuyer),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				return forkJoin(of(store.salesAgreement.id), this.salesAgreementService.addUpdateSalesAgreementBuyer(store.salesAgreement.id, action.buyer));
			}),
			switchMap(([salesAgreementId, buyer]) =>
			{
				return this.salesAgreementService.getSalesAgreementBuyer(salesAgreementId, buyer.id);
			}),
			switchMap(buyer =>
			{
				return of(new BuyerSaved(buyer));
			})
		), SaveError, "Error updating primary buyer!!")
	);

	@Effect()
	updateCoBuyer: Observable<Action> = this.actions$.pipe(
		ofType<UpdateCoBuyer>(SalesAgreementActionTypes.UpdateCoBuyer),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				return forkJoin(of(store.salesAgreement.id), this.salesAgreementService.addUpdateSalesAgreementBuyer(store.salesAgreement.id, action.coBuyer));
			}),
			switchMap(([salesAgreementId, buyer]) =>
			{
				return this.salesAgreementService.getSalesAgreementBuyer(salesAgreementId, buyer.id);
			}),
			switchMap(coBuyer =>
			{
				return of(new BuyerSaved(coBuyer));
			})
		), SaveError, "Error updating co-buyer!!")
	);

	@Effect()
	swapPrimaryBuyer: Observable<Action> = this.actions$.pipe(
		ofType<SwapPrimaryBuyer>(SalesAgreementActionTypes.SwapPrimaryBuyer),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				// note: saveSwapPrimaryBuyer sends a batch patch and it fails in EDH
				//       because there can only be one primary buyer at a time so we
				//       will make separate calls instead
				//return this.salesAgreementService.saveSwapPrimaryBuyer(store.salesAgreement.salesAgreement.id, action.coBuyer, store.salesAgreement.primaryBuyer);

				const oldPrimaryBuyer: Buyer = { ...store.salesAgreement.buyers.find(b => b.isPrimaryBuyer), isPrimaryBuyer: false, sortKey: action.coBuyer.sortKey };
				const newPrimaryBuyer: Buyer = { ...action.coBuyer, isPrimaryBuyer: true, sortKey: 0 };

				return this.salesAgreementService.patchSalesAgreementBuyer(store.salesAgreement.id, oldPrimaryBuyer)
					.pipe(
						concatMap(oldPrimaryBuyer =>
						{
							return forkJoin(of(oldPrimaryBuyer), this.salesAgreementService.patchSalesAgreementBuyer(store.salesAgreement.id, newPrimaryBuyer));
						})
					);
			}),
			switchMap(([oldPrimaryBuyer, newPrimaryBuyer]) => from([new BuyersSwapped(oldPrimaryBuyer, newPrimaryBuyer),
			new OpportunityContactAssocUpdated(newPrimaryBuyer.opportunityContactAssoc)]))
		), SaveError, "Error swapping primary buyer!!")
	);

	@Effect()
	addCoBuyer: Observable<Action> = this.actions$.pipe(
		ofType<AddCoBuyer>(SalesAgreementActionTypes.AddCoBuyer),
		withLatestFrom(this.store, this.store.pipe(select(fromSalesAgreement.primaryBuyer)), this.store.pipe(select(fromSalesAgreement.coBuyers))),
		tryCatch(source => source.pipe(
			switchMap(([action, store, primaryBuyer, coBuyers]) =>
			{
				const salesCommunityId = primaryBuyer.opportunityContactAssoc.opportunity.salesCommunityId;
				const opportunityGuid = primaryBuyer.opportunityContactAssoc.opportunity.dynamicsOpportunityId;
				const sortKey = coBuyers.length + 1;
				let coBuyer = new Buyer(action.coBuyer);

				coBuyer.sortKey = sortKey;
				coBuyer.opportunityContactAssoc.opportunity.salesCommunityId = salesCommunityId;
				coBuyer.opportunityContactAssoc.opportunity.dynamicsOpportunityId = opportunityGuid;
				coBuyer.isOriginalSigner = store.salesAgreement.status === 'Pending' ? true : false;

				return forkJoin(of(store.salesAgreement.id), this.salesAgreementService.addUpdateSalesAgreementBuyer(store.salesAgreement.id, coBuyer));
			}),
			switchMap(([salesAgreementId, buyer]) =>
			{
				return this.salesAgreementService.getSalesAgreementBuyer(salesAgreementId, buyer.id);
			}),
			switchMap(buyer => of(new CoBuyerAdded(buyer)))
		), SaveError, "Error adding co-buyer!!")
	);

	@Effect()
	addUpdateRealtor: Observable<Action> = this.actions$.pipe(
		ofType<AddUpdateRealtor>(SalesAgreementActionTypes.AddUpdateRealtor),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				return this.salesAgreementService.addUpdateSalesAgreementRealtor(store.salesAgreement.id, action.realtor);
			}),
			switchMap(realtor =>
			{
				return this.salesAgreementService.getSalesAgreementRealtor(realtor.salesAgreementId).pipe(
					catchError(error => this.store.pipe(take(1), select(state => state.salesAgreement.realtors[0])))
				);
			}),
			switchMap(realtor =>
			{
				return of<Action>(new RealtorSaved(realtor));
			})
		), SaveError, "Error updating realtor!!")
	);

	@Effect()
	reSortCoBuyers: Observable<Action> = this.actions$.pipe(
		ofType<ReSortCoBuyers>(SalesAgreementActionTypes.ReSortCoBuyers),
		withLatestFrom(this.store, this.store.pipe(select(fromSalesAgreement.coBuyers))),
		tryCatch(source => source.pipe(
			switchMap(([action, store, coBuyers]) =>
			{
				const salesAgreementId = store.salesAgreement.id;
				const coBuyersToReSort = coBuyers.map<Buyer>(b =>
				{
					if (b.sortKey === action.sourceSortKey)
					{
						return { ...b, sortKey: action.targetSortKey };
					}

					if (action.sourceSortKey > action.targetSortKey &&
						b.sortKey >= action.targetSortKey &&
						b.sortKey < action.sourceSortKey)
					{
						return { ...b, sortKey: ++b.sortKey };
					}

					if (action.sourceSortKey < action.targetSortKey &&
						b.sortKey > action.sourceSortKey &&
						b.sortKey <= action.targetSortKey)
					{
						return { ...b, sortKey: --b.sortKey };
					}

					return { ...b };
				});

				return this.salesAgreementService.saveReSortedBuyers(salesAgreementId, coBuyersToReSort);
			}),
			switchMap(updatedBuyers => of(new CoBuyersReSorted(updatedBuyers)))
		), SaveError, "Error re-sorting co-buyers!!")
	);

	/*
	 * Saved Program
	 */
	@Effect()
	saveProgram$: Observable<Action> = this.actions$.pipe(
		ofType<SaveProgram>(SalesAgreementActionTypes.SaveProgram),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const program: SalesAgreementProgram = action.program;
				const salesProgName: string = action.salesProgramName

				return forkJoin(of(store.salesAgreement), this.salesAgreementService.saveProgram(program), of(salesProgName));
			}),
			switchMap(([sa, program, salesProgName]) =>
			{
				let newSA = { id: sa.id, salePrice: sa.salePrice, status: sa.status } as SalesAgreement;

				return from([
					new ProgramSaved(program, salesProgName),
					new UpdateSalesAgreement(newSA)
				]);
			})
		), SaveError, "Error saving program!!")
	);

	/*
	 * Deletes Program
	 */
	@Effect()
	deleteProgram$: Observable<Action> = this.actions$.pipe(
		ofType<DeleteProgram>(SalesAgreementActionTypes.DeleteProgram),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const salesAgreementId = store.salesAgreement.id;

				return forkJoin(of(store.salesAgreement), this.salesAgreementService.deleteProgram(salesAgreementId, action.program.id));
			}),
			switchMap(([sa, result]) =>
			{
				let newSA = { id: sa.id, salePrice: sa.salePrice, status: sa.status } as SalesAgreement;

				return from([
					new ProgramDeleted(result),
					new UpdateSalesAgreement(newSA)
				]);
			})
		), SaveError, "Error deleting program!!")
	);

	/*
	 * Saved Deposit
	 */
	@Effect()
	saveDeposit$: Observable<Action> = this.actions$.pipe(
		ofType<SaveDeposit>(SalesAgreementActionTypes.SaveDeposit),
		tryCatch(source => source.pipe(
			switchMap(action =>
				this.salesAgreementService.saveDeposit(action.deposit, action.processElectronically)
			),
			map(deposit => new DepositSaved(deposit))
		), SaveError, "Error saving deposit!!")
	);

	/*
	 * Deletes Deposit
	 */
	@Effect()
	deleteDeposit$: Observable<Action> = this.actions$.pipe(
		ofType<DeleteDeposit>(SalesAgreementActionTypes.DeleteDeposit),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const salesAgreementId = store.salesAgreement.id;

				return this.salesAgreementService.deleteDeposit(salesAgreementId, action.deposit.id);
			}),
			map(result => new DepositDeleted(result))
		), SaveError, "Error deleting deposit!!")
	);

	/*
	 * Save Contingency
	 */
	@Effect()
	saveContingency$: Observable<Action> = this.actions$.pipe(
		ofType<SaveContingency>(SalesAgreementActionTypes.SaveContingency),
		tryCatch(source => source.pipe(
			map(action => action.contingency),
			switchMap((contingency: SalesAgreementContingency) =>
				this.salesAgreementService.saveContingency(contingency)
			),
			map(contingency => new ContingencySaved(contingency))
		), SaveError, "Error saving contingency!!")
	);

	/*
	 * Deletes Contingency
	 */
	@Effect()
	deleteContingency$: Observable<Action> = this.actions$.pipe(
		ofType<DeleteContingency>(SalesAgreementActionTypes.DeleteContingency),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const salesAgreementId = store.salesAgreement.id;

				return this.salesAgreementService.deleteContingency(salesAgreementId, action.contingency.id);
			}),
			map(result => new ContingencyDeleted(result))
		), SaveError, "Error deleting contingency!!")
	);

	/*
	 * Saved Note
	 * TODO: Add support for other types of notes
	 */
	@Effect()
	saveNote$: Observable<Action> = this.actions$.pipe(
		ofType<SaveNote>(SalesAgreementActionTypes.SaveNote),
		tryCatch(source => source.pipe(
			switchMap(action =>
				this.salesAgreementService.saveNote(action.note)
			),
			map(result => new NoteSaved(result))
		), SaveError, "Error saving note!!")
	);

	/*
	 * Deletes Note
	 */
	@Effect()
	deleteNote$: Observable<Action> = this.actions$.pipe(
		ofType<DeleteNote>(SalesAgreementActionTypes.DeleteNote),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				return this.salesAgreementService.deleteNote(action.noteId, store.salesAgreement.id);
			}),
			map(result => new NoteDeleted(result))
		), SaveError, "Error deleting note!!")
	);

	/*
	 * Void Sales Agreement
	 */
	@Effect()
	voidSalesAgreement$: Observable<Action> = this.actions$.pipe(
		ofType<VoidSalesAgreement>(SalesAgreementActionTypes.VoidSalesAgreement),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				return forkJoin(of(store.job), this.salesAgreementService.voidSalesAgreement(store.salesAgreement.id || null));
			}),
			switchMap(([jobState, salesAgreement]) =>
			{
				const job: Job = _.cloneDeep(jobState);

				// look at the last changeOrderGroup (most recently created date) and update description
				let co = job.changeOrderGroups.reduce((r, a) => r.createdUtcDate > a.createdUtcDate ? r : a);

				co.salesStatusDescription = "Withdrawn";
				co.salesStatusUTCDate = salesAgreement.lastModifiedUtcDate;

				job.lot.lotStatusDescription = "Available";

				return from([
					new ChangeOrderActions.CurrentChangeOrderCancelled(),
					new JobActions.JobUpdated(job),
					new SalesAgreementSaved(salesAgreement)
				]);
			})
		), SaveError, "Error voiding sales agreement!!")
	);

	/*
	 * Cancel Sales Agreement
	 */
	@Effect()
	cancelSalesAgreement$: Observable<Action> = this.actions$.pipe(
		ofType<CancelSalesAgreement>(SalesAgreementActionTypes.CancelSalesAgreement),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				return forkJoin(of(action), of(store), this.salesAgreementService.cancelSalesAgreement(store.salesAgreement.id, action.buildType, action.noteContent, action.reasonKey));
			}),
			switchMap(([action, store, salesAgreement]) =>
			{
				const job: Job = _.cloneDeep(store.job);

				return from([
					new ChangeOrderActions.CreateCancellationChangeOrder(),
					new ChangeOrderActions.CurrentChangeOrderCancelled(),
					new SalesAgreementCancelled(salesAgreement, job, action.buildType)
				]);
			})
		), SaveError, 'Error canceling sales agreement!!')
	);

	/*
	 * Sales Agreement Out For Signature
	 */
	@Effect()
	salesAgreementOutForSignature$: Observable<Action> = this.actions$.pipe(
		ofType<SalesAgreementOutForSignature>(SalesAgreementActionTypes.SalesAgreementOutForSignature),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				let eSignEnvelope: Observable<ESignEnvelope>;

				// create eSignEnvelope record to track docusign status
				if (!action.isWetSign)
				{
					const co = (store.job as Job).changeOrderGroups.find(co => co.salesStatusDescription === "Pending");

					let draftESignEnvelope = co.eSignEnvelopes && co.eSignEnvelopes.find(e => e.eSignStatusId === ESignStatusEnum.Created);

					if (draftESignEnvelope)
					{
						// if there's an existing draft esign envelope then set it to sent
						eSignEnvelope = this.changeOrderService.updateESignEnvelope({ ...draftESignEnvelope, eSignStatusId: ESignStatusEnum.Sent });
					}
					else
					{
						const newEnvelope = {
							edhChangeOrderGroupId: co.id,
							envelopeGuid: store.contract.envelopeId,
							eSignStatusId: ESignStatusEnum.Sent,
							eSignTypeId: ESignTypeEnum.SalesAgreement
						};

						eSignEnvelope = this.changeOrderService.createESignEnvelope(newEnvelope);
					}
				}
				else
				{
					// envelope was printed so remove any draft envelopes
					const co = (store.job as Job).changeOrderGroups.find(co => co.salesStatusDescription === "Pending");

					let draftESignEnvelope = co.eSignEnvelopes && co.eSignEnvelopes.find(e => e.eSignStatusId === ESignStatusEnum.Created);

					if (draftESignEnvelope)
					{
						draftESignEnvelope = new ESignEnvelope(draftESignEnvelope);

						draftESignEnvelope.eSignStatusId = ESignStatusEnum.Printed;

						eSignEnvelope = this.changeOrderService.updateESignEnvelope(draftESignEnvelope);
					}
				}

				const marketId = store.org.salesCommunity.market.id;
				const financialCommunityId = store.job.financialCommunityId;
				const customMergeFields = this.contractService.getCustomMergeFields(marketId, financialCommunityId);
				const systemMergeFields = this.store.pipe(select(fromRoot.systemMergeFields), take(1));

				return this.salesAgreementService.setSalesAgreementOutForSignature(store.salesAgreement.id || null).pipe(
					combineLatest(
						!eSignEnvelope ? of<ESignEnvelope>(null) : eSignEnvelope,
						customMergeFields,
						systemMergeFields
					), map(([salesAgreement, eSignEnvelope, customMergeFields, systemMergeFields]) =>
					{
						return { salesAgreement, eSignEnvelope, customMergeFields, systemMergeFields, job: store.job };
					}));
			}),
			switchMap(data =>
			{
				// lock down merge fields by saving them to storage
				return this.contractService.lockMergeFields(data.customMergeFields, data.systemMergeFields, data.job.id).pipe(
					withLatestFrom(
						of(data.job),
						of(data.salesAgreement),
						of(data.eSignEnvelope)
					)
				);
			}),
			switchMap(([ret, jobState, salesAgreement, eSignEnvelope]) =>
			{
				const job: Job = _.cloneDeep(jobState);
				const statusUtcDate = salesAgreement.lastModifiedUtcDate;

				job.changeOrderGroups.map(co =>
				{
					if (co.salesStatusDescription === "Pending")
					{
						co.salesStatusDescription = "OutforSignature";
						co.salesStatusUTCDate = statusUtcDate;
						co.jobChangeOrderGroupSalesStatusHistories.push({
							jobChangeOrderGroupId: co.id,
							salesStatusId: SalesStatusEnum.OutforSignature,
							createdUtcDate: statusUtcDate,
							salesStatusUtcDate: statusUtcDate
						});

						if (!!eSignEnvelope)
						{
							if (!!co.eSignEnvelopes)
							{
								co.eSignEnvelopes = [...co.eSignEnvelopes.filter(e => e.eSignEnvelopeId !== eSignEnvelope.eSignEnvelopeId), eSignEnvelope];
							}
							else
							{
								co.eSignEnvelopes = [eSignEnvelope];
							}
						}
					}
				});

				return from([
					new ChangeOrderActions.CurrentChangeOrderOutForSignature(statusUtcDate),
					new JobActions.JobUpdated(job),
					new SalesAgreementSaved(salesAgreement),
					new CommonActions.ESignEnvelopesLoaded([eSignEnvelope])
				]);
			})
		), SaveError, "Error setting sales agreement out for signature!!")
	);

	/*
	 * Sign Sales Agreement
	 */
	@Effect()
	signSalesAgreement$: Observable<Action> = this.actions$.pipe(
		ofType<SignSalesAgreement>(SalesAgreementActionTypes.SignSalesAgreement),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				return forkJoin(of(store.job), this.salesAgreementService.signSalesAgreement(store.salesAgreement.id || null, action.signedDate));
			}),
			switchMap(([jobState, salesAgreement]) =>
			{
				const job: Job = _.cloneDeep(jobState);
				const statusUtcDate = salesAgreement.lastModifiedUtcDate;

				// look at the last changeOrderGroup (most recently created date) and update description
				let co = job.changeOrderGroups.reduce((r, a) => r.createdUtcDate > a.createdUtcDate ? r : a);

				co.salesStatusDescription = 'Signed';
				co.salesStatusUTCDate = statusUtcDate;
				co.jobChangeOrderGroupSalesStatusHistories.push({
					jobChangeOrderGroupId: co.id,
					salesStatusId: SalesStatusEnum.Signed,
					createdUtcDate: statusUtcDate,
					salesStatusUtcDate: statusUtcDate
				});

				return from([
					new ChangeOrderActions.CurrentChangeOrderSigned(statusUtcDate),
					new JobActions.JobUpdated(job),
					new SalesAgreementSaved(salesAgreement)
				]);
			})
		), SaveError, "Error signing sales agreement!!")
	);

	/*
	 * Approve Sales Agreement
	 */
	@Effect()
	approveSalesAgreement$: Observable<Action> = this.actions$.pipe(
		ofType<ApproveSalesAgreement>(SalesAgreementActionTypes.ApproveSalesAgreement),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				return forkJoin(of(action), of(store), this.changeOrderService.getChangeOrderTypeAutoApproval(store.job.financialCommunityId));
			}),
			switchMap(([action, store, communityAutoApprovals]) =>
			{
				const co = store.job.changeOrderGroups.reduce((r, a) => r.createdUtcDate > a.createdUtcDate ? r : a);
				let autoApproval = true;

				if (co.jobChangeOrders.some(changeOrder => changeOrder.jobChangeOrderTypeDescription === 'BuyerChangeOrder'))
				{
					if (co.jobChangeOrders.some(changeOrder => changeOrder.jobChangeOrderTypeDescription === 'ChoiceAttribute' || changeOrder.jobChangeOrderTypeDescription === 'Elevation'))
					{
						if (co.jobChangeOrders.some(changeOrder => changeOrder.jobChangeOrderTypeDescription === 'ChoiceAttribute'))
						{
							if (!communityAutoApprovals.find(aa => aa.edhChangeOrderTypeId === 4).isAutoApproval)
							{
								autoApproval = false;
							}
						}

						if (co.jobChangeOrders.some(changeOrder => changeOrder.jobChangeOrderTypeDescription === 'Elevation') && autoApproval)
						{
							if (!communityAutoApprovals.find(aa => aa.edhChangeOrderTypeId === 2).isAutoApproval)
							{
								autoApproval = false;
							}
						}
					}
				}
				else
				{
					autoApproval = communityAutoApprovals.find(aa => aa.edhChangeOrderTypeId === 0).isAutoApproval;
				}

				return forkJoin(of(store.job), of(autoApproval), this.salesAgreementService.approveSalesAgreement(store.salesAgreement.id || null, autoApproval));
			}),
			switchMap(([jobState, isAutoApproval, salesAgreement]) =>
			{
				if (isAutoApproval)
				{
					return of<Action>(new CommonActions.LoadSalesAgreement(salesAgreement.id, false));
				}
				else
				{

					const job: Job = _.cloneDeep(jobState);
					const statusUtcDate = salesAgreement.lastModifiedUtcDate;

					// look at the last changeOrderGroup (most recently created date) and update description
					const co = job.changeOrderGroups.reduce((r, a) => r.createdUtcDate > a.createdUtcDate ? r : a);

					co.salesStatusDescription = "Approved";
					co.salesStatusUTCDate = statusUtcDate;
					co.constructionStatusDescription = 'Pending';
					co.constructionStatusUtcDate = statusUtcDate;
					co.jobChangeOrderGroupSalesStatusHistories.push({
						jobChangeOrderGroupId: co.id,
						salesStatusId: SalesStatusEnum.Approved,
						createdUtcDate: statusUtcDate,
						salesStatusUtcDate: statusUtcDate
					});

					return from([
						new ChangeOrderActions.CurrentChangeOrderApproved(),
						new SalesAgreementSaved(salesAgreement),
						new ChangeOrderActions.SetChangingOrder(false, null, false)]);
				}
			})
		), SaveError, "Error approving sales agreement!!")
	);

	@Effect()
	createJIOForSpec$: Observable<Action> = this.actions$.pipe(
		ofType<CreateJIOForSpec>(SalesAgreementActionTypes.CreateJIOForSpec),
		withLatestFrom(this.store),
		exhaustMap(([action, store]) =>
			this.salesAgreementService.createJIOForSpec(store.scenario.tree, store.scenario.scenario, store.scenario.tree.financialCommunityId, store.scenario.buildMode, store.scenario.options.find(o => o.isBaseHouse), false).pipe(
				tap(sag => this.router.navigateByUrl('/change-orders')),
				switchMap(job =>
				{
					let jobLoaded$ = this.actions$.pipe(
						ofType<CommonActions.JobLoaded>(CommonActions.CommonActionTypes.JobLoaded),
						take(1),
						map(() => new CreateEnvelope(false))
					);

					return <Observable<Action>>from([
						new LoadSpec(job),
						new JIOForSpecCreated()
					]).pipe(
						concat(jobLoaded$)
					);
				}),
				catchError<Action, Observable<Action>>(error =>
				{
					if (error.error.Message === "Lot Unavailable")
					{
						return of(new LotConflict());
					}

					return of(new SaveError(error))
				})
			)
		)
	);

	@Effect()
	saveSalesConsultants$: Observable<Action> = this.actions$.pipe(
		ofType<SaveSalesConsultants>(SalesAgreementActionTypes.SaveSalesConsultants),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
				this.salesAgreementService.saveSalesAgreementSalesConsultants(store.salesAgreement.id, action.consultants)
			),
			map(consultants => new SalesConsultantsSaved(consultants))
		), SaveError, "Error saving sales consultants!!")
	);

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private salesAgreementService: SalesAgreementService,
		private changeOrderService: ChangeOrderService,
		private contractService: ContractService,
		private router: Router,
		private spinnerService: SpinnerService
	) { }
}
