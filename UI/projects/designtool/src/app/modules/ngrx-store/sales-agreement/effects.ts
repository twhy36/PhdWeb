import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';
import { Observable, forkJoin, from, of } from 'rxjs';
import { concatMap, exhaustMap, switchMap, catchError, withLatestFrom, map, take, tap, combineLatest, concat, finalize } from 'rxjs/operators';

import * as _ from 'lodash';

import { SalesAgreementService } from '../../core/services/sales-agreement.service';
import { ChangeOrderService } from '../../core/services/change-order.service';
import { ContractService } from '../../core/services/contract.service';
import { SalesInfoService } from '../../core/services/sales-info.service';

import * as JobActions from '../job/actions';
import * as ChangeOrderActions from '../change-order/actions';
import * as CommonActions from '../actions';

import
{
	SalesAgreementOutForSignature, SalesAgreementPending, SalesAgreementActionTypes, UpdateSalesAgreement, SalesAgreementSaved, SaveError,
	CreateSalesAgreementForScenario, SalesAgreementCreated, LoadBuyers, BuyersLoaded, SetTrustName, SwapPrimaryBuyer, AddCoBuyer, CoBuyerAdded,
	BuyersSwapped, DeleteCoBuyer, CoBuyerDeleted, UpdatePrimaryBuyer, UpdateCoBuyer, AddUpdateRealtor, RealtorSaved, ReSortCoBuyers, BuyerSaved, SalesAgreementLoadError,
	CoBuyersReSorted, TrustNameSaved, LoadRealtor, RealtorLoaded, DeleteProgram, ProgramSaved, SaveProgram, ProgramDeleted, SaveDeposit, DeleteDeposit, DepositSaved,
	DepositDeleted, DeleteContingency, ContingencyDeleted, SaveContingency, ContingencySaved, SaveNote, NoteDeleted, NoteSaved, DeleteNote, VoidSalesAgreement,
	SignSalesAgreement, ApproveSalesAgreement, CreateJIOForSpec, JIOForSpecCreated, SetIsFloorplanFlippedAgreement, SetIsDesignComplete, IsFloorplanFlippedAgreement,
	CancelSalesAgreement, LoadConsultants, ConsultantsLoaded, SaveSalesConsultants, SalesConsultantsSaved, SaveSalesAgreementInfoNA, SalesAgreementInfoNASaved, IsDesignCompleteSaved
} from './actions';
import { DeleteScenarioInfo, LotConflict } from '../scenario/actions';
import { OpportunityContactAssocUpdated } from '../opportunity/actions';

import * as fromRoot from '../reducers';
import * as fromSalesAgreement from './reducer';

import
{
	Buyer, ESignEnvelope, ESignStatusEnum, ESignTypeEnum, SalesStatusEnum, Job, SalesAgreementInfo, SalesAgreementProgram,
	SalesAgreementContingency, SalesAgreement, SpinnerService, SpecDiscountService, Constants
} from 'phd-common';

import { tryCatch } from '../error.action';
import { SalesAgreementCancelled, LoadSpec } from '../actions';
import { TemplatesLoaded, CreateEnvelope } from '../contract/actions';

import { JobService } from '../../core/services/job.service';

// Phd Lite
import { LiteService } from '../../core/services/lite.service';

@Injectable()
export class SalesAgreementEffects
{
	createSalesAgreement$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CreateSalesAgreementForScenario>(SalesAgreementActionTypes.CreateSalesAgreementForScenario),
			withLatestFrom(
				this.store,
				this.store.pipe(select(fromRoot.priceBreakdown)),
				this.store.pipe(select(fromRoot.legacyColorScheme)),
			),
			exhaustMap(([action, store, priceBreakdown, legacyColorScheme]) =>
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

				const isPhdLite = store.lite.isPhdLite || !store.scenario.tree;
				const pendingJobSummary = isPhdLite
					? this.liteService.mapPendingJobSummaryLite(store.job.id, priceBreakdown, store.lite.scenarioOptions, store.lite.options)
					: this.changeOrderService.mapPendingJobSummary(store.job.id, priceBreakdown, store.scenario.tree, store.scenario.options);

				const createSalesAgreementForScenario = store.lite.isPhdLite
					? this.liteService.createSalesAgreementForLiteScenario(
						store.lite,
						store.scenario.scenario.scenarioId,
						salePrice,
						priceBreakdown.baseHouse,
						store.job.jobPlanOptions,
						isSpecSale,
						legacyColorScheme,
						pendingJobSummary
					)
					: this.salesAgreementService.createSalesAgreementForScenario(
						store.scenario.scenario,
						store.scenario.tree,
						store.scenario.options.find(o => o.isBaseHouse),
						salePrice,
						store.scenario.rules.optionRules,
						pendingJobSummary
					);

				return createSalesAgreementForScenario.pipe(
					combineLatest(//fetch contract templates
						this.contractService.getTemplates(store.org.salesCommunity.market.id, store.scenario.scenario.financialCommunityId).pipe(
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
	});

	loadBuyers$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<LoadBuyers>(SalesAgreementActionTypes.LoadBuyers),
			tryCatch(source => source.pipe(
				switchMap(action => this.salesAgreementService.getSalesAgreementBuyers(action.salesAgreementId)),
				switchMap(buyers => of(new BuyersLoaded(buyers)))
			), SalesAgreementLoadError, "Error loading buyers!!")
		);
	});

	loadConsultants: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<LoadConsultants>(SalesAgreementActionTypes.LoadConsultants),
			tryCatch(source => source.pipe(
				switchMap(action => this.salesAgreementService.getSalesAgreementConsultants(action.salesAgreementId)),
				switchMap(consultants => of(new ConsultantsLoaded(consultants)))
			), SalesAgreementLoadError, "Error loading consultants!!")
		);
	});

	loadRealtor$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<LoadRealtor>(SalesAgreementActionTypes.LoadRealtor),
			tryCatch(source => source.pipe(
				switchMap(action => this.salesAgreementService.getSalesAgreementRealtor(action.salesAgreementId)),
				switchMap(realtor => of(new RealtorLoaded(realtor)))
			), SalesAgreementLoadError, "Error loading realtor!!")
		);
	});

	saveTrust$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SetTrustName>(SalesAgreementActionTypes.SetTrustName),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) => this.salesAgreementService.updateSalesAgreement({ id: store.salesAgreement.id, trustName: action.trustName })),
				switchMap(salesAgreement => of(new TrustNameSaved(salesAgreement.trustName)))
			), SaveError, "Error saving trust!!")
		);
	});

	updateSalesAgreement$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<UpdateSalesAgreement>(SalesAgreementActionTypes.UpdateSalesAgreement),
			withLatestFrom(
				this.store,
				this.store.pipe(select(fromRoot.priceBreakdown))
			),
			tryCatch(source => source.pipe(
				switchMap(([action, store, priceBreakdown]) =>
				{
					const sa = new SalesAgreement(action.salesAgreement);

					if (sa.status == Constants.AGREEMENT_STATUS_PENDING || sa.status == Constants.AGREEMENT_STATUS_OUT_FOR_SIGNATURE)
					{
						sa.salePrice = priceBreakdown.totalPrice;
					}

					const isPhdLite = store.lite.isPhdLite || !store.scenario.tree;
					const pendingJobSummary = isPhdLite
						? this.liteService.mapPendingJobSummaryLite(store.job.id, priceBreakdown, store.lite.scenarioOptions, store.lite.options)
						: this.changeOrderService.mapPendingJobSummary(store.job.id, priceBreakdown, store.scenario.tree, store.scenario.options);

					return forkJoin([
						this.salesAgreementService.updateSalesAgreement(sa),
						this.jobService.updatePendingJobSummary(pendingJobSummary)
					]);
				}),
				switchMap(([salesAgreement]) => of(new SalesAgreementSaved(salesAgreement)))
			), SaveError, 'Error updating sales agreement!!')
		);
	});

	saveSalesAgreementInfoNA: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	saveIsFloorplanFlippedAgreement$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	setIsDesignComplete$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SetIsDesignComplete>(SalesAgreementActionTypes.SetIsDesignComplete),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					const info: SalesAgreementInfo = { edhSalesAgreementId: store.salesAgreement.id, isDesignComplete: action.isDesignComplete };
					if (!!store.salesAgreement.id)
					{
						return this.salesAgreementService.saveSalesAgreementInfo(info);
					}

					return of(info);
				}),
				switchMap(info => of(new IsDesignCompleteSaved(info.isDesignComplete)))
			), SaveError, "Error saving is design complete flag!!")
		);
	});

	/*
	 * Deletes Co-Buyer
	 */
	deleteCoBuyer: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	/*
	 * Re-Sorts Co-Buyers after deletion for Co-Buyers with a Sort Key > Deleted Co-Buyer Sort Key
	 */
	coBuyerDeleted: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	updatePrimaryBuyer: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	updateCoBuyer: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	swapPrimaryBuyer: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	addCoBuyer: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
					coBuyer.isOriginalSigner = store.salesAgreement.status === Constants.AGREEMENT_STATUS_PENDING ? true : false;

					return forkJoin(of(store.salesAgreement.id), this.salesAgreementService.addUpdateSalesAgreementBuyer(store.salesAgreement.id, coBuyer));
				}),
				switchMap(([salesAgreementId, buyer]) =>
				{
					return this.salesAgreementService.getSalesAgreementBuyer(salesAgreementId, buyer.id);
				}),
				switchMap(buyer => of(new CoBuyerAdded(buyer)))
			), SaveError, "Error adding co-buyer!!")
		);
	});

	addUpdateRealtor: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	reSortCoBuyers: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	/*
	 * Saved Program
	 */
	saveProgram$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	/*
	 * Deletes Program
	 */
	deleteProgram$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	/*
	 * Saved Deposit
	 */
	saveDeposit$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SaveDeposit>(SalesAgreementActionTypes.SaveDeposit),
			tryCatch(source => source.pipe(
				switchMap(action =>
					this.salesAgreementService.saveDeposit(action.deposit, action.processElectronically)
				),
				map(deposit => new DepositSaved(deposit))
			), SaveError, "Error saving deposit!!")
		);
	});

	/*
	 * Deletes Deposit
	 */
	deleteDeposit$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	/*
	 * Save Contingency
	 */
	saveContingency$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SaveContingency>(SalesAgreementActionTypes.SaveContingency),
			tryCatch(source => source.pipe(
				map(action => action.contingency),
				switchMap((contingency: SalesAgreementContingency) =>
					this.salesAgreementService.saveContingency(contingency)
				),
				map(contingency => new ContingencySaved(contingency))
			), SaveError, "Error saving contingency!!")
		);
	});

	/*
	 * Deletes Contingency
	 */
	deleteContingency$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	/*
	 * Saved Note
	 * TODO: Add support for other types of notes
	 */
	saveNote$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SaveNote>(SalesAgreementActionTypes.SaveNote),
			tryCatch(source => source.pipe(
				switchMap(action =>
					this.salesAgreementService.saveNote(action.note)
				),
				map(result => new NoteSaved(result))
			), SaveError, "Error saving note!!")
		);
	});

	/*
	 * Deletes Note
	 */
	deleteNote$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	/*
	 * Void Sales Agreement
	 */
	voidSalesAgreement$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<VoidSalesAgreement>(SalesAgreementActionTypes.VoidSalesAgreement),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
				{
					return forkJoin(of(store.job), this.salesAgreementService.voidSalesAgreement(store.salesAgreement.id || null, action.reasonKey));
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
	});

	/*
	 * Cancel Sales Agreement
	 */
	cancelSalesAgreement$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
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

					// Find the active change orders
					let activeChangeOrders = job.changeOrderGroups
						.filter(t => ['Pending', 'OutforSignature', 'Signed', 'Rejected'].indexOf(t.salesStatusDescription) !== -1)
						.concat(job.changeOrderGroups
							.filter(t => t.salesStatusDescription === 'Approved' && t.constructionStatusDescription !== 'Approved')
						);

					// Update each active change order
					activeChangeOrders.forEach(co =>
					{
						co.salesStatusDescription = 'Withdrawn';
						co.salesStatusUTCDate = salesAgreement.lastModifiedUtcDate;
					});

					// Unlike voiding an agreement, which EDH handles,
					// we need to manually withdraw the active change order ourselves
					return forkJoin(of(action), of(salesAgreement), of(job), this.changeOrderService.updateJobChangeOrder(activeChangeOrders), this.jobService.deleteTimeOfSaleOptionPricesForJob(job.id));
				}),
				switchMap(([action, salesAgreement, job, updatedChangeOrders, deletedOptionPrices]) =>
				{
					return from([
						new CommonActions.ChangeOrdersUpdated(updatedChangeOrders),
						new ChangeOrderActions.CreateCancellationChangeOrder(),
						new ChangeOrderActions.CurrentChangeOrderCancelled(),
						new JobActions.JobUpdated(job),
						new SalesAgreementCancelled(salesAgreement, job, action.buildType),
						new JobActions.ReplaceOptionPriceDeleted(deletedOptionPrices)
					]);
				})
			), SaveError, 'Error canceling sales agreement!!')
		)
	);

	/*
	 * Sales Agreement Out For Signature
	 */
	salesAgreementOutForSignature$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
						const eSignStatus = action.isEdit ? ESignStatusEnum.Created : ESignStatusEnum.Sent;

						if (draftESignEnvelope)
						{
							// if there's an existing draft esign envelope then set it to sent
							eSignEnvelope = this.changeOrderService.updateESignEnvelope({ ...draftESignEnvelope, eSignStatusId: eSignStatus });
						}
						else
						{
							const newEnvelope = {
								edhChangeOrderGroupId: co.id,
								envelopeGuid: store.contract.envelopeId,
								eSignStatusId: eSignStatus,
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

					return this.salesAgreementService.setSalesAgreementStatus(store.salesAgreement.id || null, Constants.AGREEMENT_STATUS_OUT_FOR_SIGNATURE).pipe(
						combineLatest(
							!eSignEnvelope ? of<ESignEnvelope>(null) : eSignEnvelope
						), map(([salesAgreement, eSignEnvelope]) =>
						{
							return { salesAgreement, eSignEnvelope, job: store.job };
						}));
				}),
				switchMap(data =>
				{
					const job: Job = _.cloneDeep(data.job);
					const statusUtcDate = data.salesAgreement.lastModifiedUtcDate;

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

							if (!!data.eSignEnvelope)
							{
								if (!!co.eSignEnvelopes)
								{
									co.eSignEnvelopes = [...co.eSignEnvelopes.filter(e => e.eSignEnvelopeId !== data.eSignEnvelope.eSignEnvelopeId), data.eSignEnvelope];
								}
								else
								{
									co.eSignEnvelopes = [data.eSignEnvelope];
								}
							}
						}
					});

					return from([
						new ChangeOrderActions.CurrentChangeOrderOutForSignature(statusUtcDate),
						new JobActions.JobUpdated(job),
						new SalesAgreementSaved(data.salesAgreement),
						new CommonActions.ESignEnvelopesLoaded([data.eSignEnvelope])
					]);
				})
			), SaveError, "Error setting sales agreement out for signature!!")
		);
	});

	/*
	 * Sales Agreement Pending
	 */
	salesAgreementPending$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SalesAgreementPending>(SalesAgreementActionTypes.SalesAgreementPending),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([, store]) =>
				{
					const co = (store.job as Job).changeOrderGroups.find(co => co.salesStatusDescription === "OutforSignature");
					const draftESignEnvelope = co.eSignEnvelopes?.find(e => e.eSignStatusId === ESignStatusEnum.Created);
					const deleteESignEnvelope = draftESignEnvelope ? this.changeOrderService.deleteESignEnvelope(draftESignEnvelope.eSignEnvelopeId) : of([]);

					return this.salesAgreementService.setSalesAgreementStatus(store.salesAgreement.id || null, Constants.AGREEMENT_STATUS_PENDING).pipe(
						combineLatest(
							deleteESignEnvelope,
							this.contractService.deleteSnapshot(co.jobId, co.id)
						),
						map(([salesAgreement, eSignEnvelope, snapShot]) =>
						{
							return { salesAgreement, job: store.job, eSignEnvelopeId: draftESignEnvelope?.eSignEnvelopeId };
						}));
				}),
				switchMap(data =>
				{
					const job: Job = _.cloneDeep(data.job);
					const statusUtcDate = data.salesAgreement.lastModifiedUtcDate;

					job.changeOrderGroups.map(co =>
					{
						if (co.salesStatusDescription === "OutforSignature")
						{
							co.salesStatusDescription = "Pending";
							co.salesStatusUTCDate = statusUtcDate;
							co.jobChangeOrderGroupSalesStatusHistories.push({
								jobChangeOrderGroupId: co.id,
								salesStatusId: SalesStatusEnum.Pending,
								createdUtcDate: statusUtcDate,
								salesStatusUtcDate: statusUtcDate
							});

							const envelopeIndex = co.eSignEnvelopes?.findIndex(x => x.eSignEnvelopeId === data.eSignEnvelopeId);
							if (envelopeIndex > -1)
							{
								co.eSignEnvelopes.splice(envelopeIndex, 1);
								co.envelopeId = null; // Envelope ID has been deleted at this stage. Reset envelope ID to null
							}
						}
					});

					return from([
						new ChangeOrderActions.CurrentChangeOrderPending(statusUtcDate, data.eSignEnvelopeId),
						new JobActions.JobUpdated(job),
						new SalesAgreementSaved(data.salesAgreement)
					]);
				})
			), SaveError, "Error setting sales agreement pending!!")
		);
	});

	/*
	 * Sign Sales Agreement
	 */
	signSalesAgreement$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	/*
	 * Approve Sales Agreement
	 */
	approveSalesAgreement$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
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
	});

	createJIOForSpec$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<CreateJIOForSpec>(SalesAgreementActionTypes.CreateJIOForSpec),
			withLatestFrom(this.store, this.store.pipe(select(fromRoot.priceBreakdown))),
			exhaustMap(([action, store, priceBreakdown]) =>
			{
				const pendingJobSummary = this.changeOrderService.mapPendingJobSummary(store.job.id, priceBreakdown, store.scenario.tree, store.scenario.options);

				return this.salesAgreementService.createJIOForSpec(
					store.scenario.tree,
					store.scenario.scenario,
					store.scenario.tree.financialCommunityId,
					store.scenario.buildMode,
					store.scenario.options.find(o => o.isBaseHouse),
					store.scenario.rules.optionRules,
					pendingJobSummary)
					.pipe(
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
			})
		);
	});

	saveSalesConsultants$: Observable<Action> = createEffect(() =>
	{
		return this.actions$.pipe(
			ofType<SaveSalesConsultants>(SalesAgreementActionTypes.SaveSalesConsultants),
			withLatestFrom(this.store),
			tryCatch(source => source.pipe(
				switchMap(([action, store]) =>
					this.salesAgreementService.saveSalesAgreementSalesConsultants(store.salesAgreement.id, action.consultants)
				),
				map(consultants => new SalesConsultantsSaved(consultants))
			), SaveError, "Error saving sales consultants!!")
		);
	});

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private salesAgreementService: SalesAgreementService,
		private changeOrderService: ChangeOrderService,
		private contractService: ContractService,
		private router: Router,
		private spinnerService: SpinnerService,
		private liteService: LiteService,
		private jobService: JobService,
		private salesInfoService: SalesInfoService,
		private specDiscountService: SpecDiscountService
	) { }
}
