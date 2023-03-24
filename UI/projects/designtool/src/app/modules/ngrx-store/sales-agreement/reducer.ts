import * as _ from 'lodash';
import { createFeatureSelector, createSelector } from '@ngrx/store';

import { SalesAgreementActions, SalesAgreementActionTypes } from './actions';

import { RehydrateMap } from '../sessionStorage';

import { Buyer, Note, SalesAgreement, SalesAgreementProgram, SalesAgreementDeposit, SalesAgreementContingency, ISalesProgram } from 'phd-common';
import { CommonActionTypes } from '../actions';

export interface State extends SalesAgreement
{
	buyersLoading: boolean,
	isCoBuyerNa: boolean,
	isContingenciesNa: boolean,
	isFloorplanFlipped: boolean,
	isNoteNa: boolean,
	isProgramNa: boolean,
	isRealtorNa: boolean,
	isTrustNa: boolean,
	isAgreementInfoViewed: boolean,
	isUnsaved: boolean,
	loadError: boolean,
	programsLoading: boolean,
	realtorLoading: boolean,
	salesAgreementLoading: boolean,
	saveError: boolean,
	savingSalesAgreement: boolean,
	savingSpecHome: boolean,
	isDesignComplete: boolean
}

RehydrateMap.onRehydrate<State>('salesAgreement', state =>
{
	return {
		...state,
		savingSalesAgreement: false,
		saveError: false,
		isUnsaved: false,
		salesAgreementLoading: false,
		buyersLoading: false,
		realtorLoading: false,
		programsLoading: false,
		loadError: false
	};
});

export const initialState: State = {
	...new SalesAgreement(),
	buyersLoading: false,
	isCoBuyerNa: false,
	isContingenciesNa: false,
	isFloorplanFlipped: false,
	isNoteNa: false,
	isProgramNa: false,
	isRealtorNa: false,
	isTrustNa: false,
	isUnsaved: false,
	isAgreementInfoViewed: false,
	loadError: false,
	programsLoading: false,
	realtorLoading: false,
	salesAgreementLoading: false,
	saveError: false,
	savingSalesAgreement: false,
	savingSpecHome: false,
	isDesignComplete: false
};

export function reducer(state: State = initialState, action: SalesAgreementActions): State
{
	switch (action.type)
	{
		case SalesAgreementActionTypes.CreateSalesAgreementForScenario:
			return { ...initialState, savingSalesAgreement: true };
		case SalesAgreementActionTypes.SalesAgreementCreated:
			return { ...initialState, ...action.salesAgreement, savingSalesAgreement: false };
		case CommonActionTypes.LoadSalesAgreement:
			return { ...state, salesAgreementLoading: true, loadError: false };
		case CommonActionTypes.SalesAgreementLoaded:
			return {
				...state,
				savingSalesAgreement: false,
				...action.salesAgreement,
				isTrustNa: action.info ? action.info.isTrustNa : null,
				isRealtorNa: action.info ? action.info.isRealtorNa : null,
				salesAgreementLoading: false,
				loadError: false,
				isProgramNa: action.info ? action.info.isProgramNa : null,
				isContingenciesNa: action.info ? action.info.isContingenciesNa : null,
				isNoteNa: action.info ? action.info.isNoteNa : null,
				isCoBuyerNa: action.info ? action.info.isCoBuyerNa : null,
				isDesignComplete: action.info ? action.info.isDesignComplete : null,
			};
		case CommonActionTypes.LoadError:
			return { ...state, salesAgreementLoading: false, loadError: true };
		case SalesAgreementActionTypes.UpdateSalesAgreement:
			return { ...state, savingSalesAgreement: true, saveError: false, isUnsaved: true };
		case SalesAgreementActionTypes.SalesAgreementSaved:
			let sa = action.salesAgreement;

			// only include the fields that can be updated by saving a sales agreement.
			let newSA = {
				approvedDate: sa.approvedDate,
				createdUtcDate: sa.createdUtcDate,
				ecoeDate: sa.ecoeDate,
				id: sa.id,
				insuranceQuoteOptIn: sa.insuranceQuoteOptIn,
				lastModifiedUtcDate: sa.lastModifiedUtcDate,
				lenderType: sa.lenderType,
				propertyType: sa.propertyType,
				salePrice: sa.salePrice,
				salesAgreementNumber: sa.salesAgreementNumber,
				signedDate: sa.signedDate,
				status: sa.status,
				statusUtcDate: sa.statusUtcDate,
				trustName: sa.trustName,
				isLockedIn: sa.isLockedIn
			};

			return { ...state, ...newSA, savingSalesAgreement: false, saveError: false, isUnsaved: false };
		case SalesAgreementActionTypes.SaveError:
			return { ...state, savingSalesAgreement: false, saveError: true };
		case SalesAgreementActionTypes.SetIsFloorplanFlippedAgreement:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.IsFloorplanFlippedAgreement:
			return { ...state, isFloorplanFlipped: action.flipped, savingSalesAgreement: false };
		case SalesAgreementActionTypes.SetIsDesignComplete:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.IsDesignCompleteSaved:
			return { ...state, isDesignComplete: action.isDesignComplete, savingSalesAgreement: false };
		case SalesAgreementActionTypes.AddUpdateRealtor:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.RealtorSaved:
			return { ...state, realtors: [action.realtor], isRealtorNa: false, savingSalesAgreement: false };
		case SalesAgreementActionTypes.SetTrustName:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.TrustNameSaved:
			return { ...state, trustName: action.trustName, isTrustNa: false, savingSalesAgreement: false };
		case SalesAgreementActionTypes.SwapPrimaryBuyer:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.BuyersSwapped:
			const buyersAfterSwap = state.buyers.map<Buyer>(b =>
			{
				if (b.sortKey === 0) {
					return action.newPrimaryBuyer;
				}

				if (b.sortKey === action.oldPrimaryBuyer.sortKey)
				{
					return action.oldPrimaryBuyer;
				}

				return b;
			});

			return { ...state, buyers: buyersAfterSwap, savingSalesAgreement: false };
		case SalesAgreementActionTypes.DeleteCoBuyer:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.CoBuyerDeleted:
			return { ...state, buyers: state.buyers.filter(b => b.id !== action.deletedCoBuyerId), savingSalesAgreement: false };
		case SalesAgreementActionTypes.UpdatePrimaryBuyer:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.BuyerSaved:
			const buyersAfterUpdate = state.buyers.map<Buyer>(b => b.id === action.buyer.id ? action.buyer : b);

			return { ...state, buyers: buyersAfterUpdate, savingSalesAgreement: false };
		case SalesAgreementActionTypes.UpdateCoBuyer:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.AddCoBuyer:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.CoBuyerAdded:
			return { ...state, buyers: [...state.buyers, { ...action.coBuyer }], isCoBuyerNa: false, savingSalesAgreement: false };
		case SalesAgreementActionTypes.ReSortCoBuyers:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.CoBuyersReSorted:
			const coBuyersReSorted = state.buyers.map<Buyer>(b =>
			{
				const foundBuyer = _.cloneDeep(action.coBuyers).find(x => x.id == b.id);

				if (foundBuyer)
				{
					return { ...b, sortKey: foundBuyer.sortKey };
				}

				return { ...b };
			});

			return { ...state, buyers: coBuyersReSorted, savingSalesAgreement: false };
		case SalesAgreementActionTypes.LoadBuyers:
			return { ...state, buyersLoading: true, loadError: false };
		case SalesAgreementActionTypes.BuyersLoaded:
			return { ...state, buyers: action.buyers, buyersLoading: false, loadError: false };
		case SalesAgreementActionTypes.PrimaryBuyerLoaded:
			const buyers = _.cloneDeep(state.buyers);

			buyers[0] = action.buyer;

			return { ...state, buyers: buyers, buyersLoading: false, loadError: false };
		case SalesAgreementActionTypes.LoadRealtor:
			return { ...state, realtorLoading: true, loadError: false };
		case SalesAgreementActionTypes.RealtorLoaded:
			let realtors = action.realtor ? [action.realtor] : [];

			return { ...state, realtors: realtors, realtorLoading: false, loadError: false };
		case SalesAgreementActionTypes.DeleteProgram:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.ProgramDeleted:
			const remainingPrograms: Array<SalesAgreementProgram> = state.programs.filter(b => b.id !== action.deletedProgramId);

			return { ...state, programs: remainingPrograms, savingSalesAgreement: false };
		case SalesAgreementActionTypes.SaveProgram:
			return { ...state, savingSalesAgreement: true, saveError: false, isUnsaved: true };
		case SalesAgreementActionTypes.ProgramSaved:
			let programs: Array<SalesAgreementProgram> = _.cloneDeep(state.programs) || [];
			let savedProgram: SalesAgreementProgram = programs.find(program => program.id === action.program.id);
			let program = new SalesAgreementProgram(action.program);

			program.salesProgram = { ...program.salesProgram, name: action.programName } as ISalesProgram;

			if (savedProgram)
			{
				// if it exist, overwrite its values with the action data
				Object.keys(savedProgram).map(prop => savedProgram[prop] = action.program[prop]);
				savedProgram.salesProgram = { ...savedProgram.salesProgram, name: action.programName } as ISalesProgram;
			}
			else
			{
				// Otherwise, this is a new program so we need to add it to programs.
				programs.push(program);
			}

			return { ...state, programs: programs, savingSalesAgreement: false, isProgramNa: false };
		case SalesAgreementActionTypes.CreateQuickMoveInIncentive:
			return { ...state, savingSalesAgreement: true, saveError: false, isUnsaved: true };
		case SalesAgreementActionTypes.DeleteDeposit:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.DepositDeleted:
			const remaining: Array<SalesAgreementDeposit> = state.deposits.filter(b => b.id !== action.deletedDepositId);

			return { ...state, deposits: remaining, savingSalesAgreement: false };
		case SalesAgreementActionTypes.SaveDeposit:
			return { ...state, savingSalesAgreement: true, saveError: false, isUnsaved: true };
		case SalesAgreementActionTypes.DepositSaved:
			let deposits: Array<SalesAgreementDeposit> = _.cloneDeep(state.deposits) || [];
			let saved: SalesAgreementDeposit = deposits.find(deposit => deposit.id === action.deposit.id);

			if (saved)
			{
				// if it exist, overwrite its values with the action data
				Object.keys(saved).map(prop => saved[prop] = action.deposit[prop]);
			}
			else
			{
				// Otherwise, this is a new deposit so we need to add it to deposits.
				deposits.push(action.deposit);
			}

			return { ...state, deposits: deposits, savingSalesAgreement: false };
		case SalesAgreementActionTypes.DeleteContingency:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.ContingencyDeleted:
			const remainingContingencies: Array<SalesAgreementContingency> = state.contingencies.filter(b => b.id !== action.deletedContingencyId);

			return { ...state, contingencies: remainingContingencies, savingSalesAgreement: false };
		case SalesAgreementActionTypes.SaveContingency:
			return { ...state, savingSalesAgreement: true, saveError: false, isUnsaved: true };
		case SalesAgreementActionTypes.ContingencySaved:
			let contingencies: Array<SalesAgreementContingency> = _.cloneDeep(state.contingencies) || [];
			let savedContingency: SalesAgreementContingency = contingencies.find(contingency => contingency.id === action.contingency.id);

			if (savedContingency)
			{
				// if it exist, overwrite its values with the action data
				Object.keys(savedContingency).map(prop => savedContingency[prop] = action.contingency[prop]);
			}
			else
			{
				// Otherwise, this is a new contingency so we need to add it to contingencies.
				contingencies.push(action.contingency);
			}

			return { ...state, contingencies: contingencies, savingSalesAgreement: false, isContingenciesNa: false };
		case SalesAgreementActionTypes.DeleteNote:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.NoteDeleted:
			const remainingNotes: Array<Note> = state.notes.filter(b => b.id !== action.noteId);

			return { ...state, notes: remainingNotes, savingSalesAgreement: false };
		case SalesAgreementActionTypes.SaveNote:
			return { ...state, savingSalesAgreement: true, saveError: false, isUnsaved: true };
		case SalesAgreementActionTypes.NoteSaved:
			let notes: Array<Note> = _.cloneDeep(state.notes) || [];
			let savedNote: Note = notes.find(note => note.id === action.note.id);

			if (savedNote)
			{
				Object.keys(savedNote).map(prop => savedNote[prop] = action.note[prop]);
			}
			else
			{
				notes.push(action.note);
			}

			return { ...state, notes: notes, isNoteNa: false, savingSalesAgreement: false };
		case SalesAgreementActionTypes.VoidSalesAgreement:
		case SalesAgreementActionTypes.CancelSalesAgreement:
		case SalesAgreementActionTypes.SalesAgreementOutForSignature:
		case SalesAgreementActionTypes.SignSalesAgreement:
		case SalesAgreementActionTypes.ApproveSalesAgreement:
			return { ...state, savingSalesAgreement: true, saveError: false, isUnsaved: true };
		case SalesAgreementActionTypes.CreateJIOForSpec:
			return { ...state, savingSpecHome: true };
		case SalesAgreementActionTypes.JIOForSpecCreated:
			return { ...state, savingSpecHome: false };
		case SalesAgreementActionTypes.SalesAgreementTerminated:
			return { ...state, cancellations: action.cancelReason, savingSalesAgreement: false, saveError: false, isUnsaved: false };
		case CommonActionTypes.SalesAgreementCancelled:
			// Set lastModifiedDate to current datetime UTC. The last modified date on Sales Agreement record is not always updated
			// by the time the API call returns. There seems to be a delay, but the record does get updated properly
			const lastModifiedDate = new Date(new Date().toUTCString());

			return { ...state, status: 'Cancel', statusUtcDate: lastModifiedDate, savingSalesAgreement: false, saveError: false, isUnsaved: false };
		case SalesAgreementActionTypes.LoadConsultants:
			return { ...state, loadError: false };
		case SalesAgreementActionTypes.ConsultantsLoaded:
			return { ...state, consultants: action.consultants, loadError: false };
		case SalesAgreementActionTypes.SaveSalesConsultants:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.SalesConsultantsSaved:
			let consultants = action.consultants;

			return { ...state, savingSalesAgreement: false, consultants: consultants };
		case SalesAgreementActionTypes.SaveSalesAgreementInfoNA:
			return { ...state, savingSalesAgreement: true };
		case SalesAgreementActionTypes.SalesAgreementInfoViewed:
			return { ...state, isAgreementInfoViewed: true };
		case SalesAgreementActionTypes.SalesAgreementInfoNASaved:
			let newState = { ...state, savingSalesAgreement: false };
			const info = action.salesAgreementInfo;

			switch (action.naType)
			{
				case 'contingency':
					newState = { ...newState, isContingenciesNa: info.isContingenciesNa, contingencies: null };

					break;
				case 'programs':
					newState = { ...newState, isProgramNa: info.isProgramNa, programs: null };

					break;
				case 'notes':
					newState = { ...newState, isNoteNa: info.isNoteNa, notes: null };

					break;
				case 'realtor':
					newState = { ...newState, isRealtorNa: info.isRealtorNa, realtors: null };

					break;
				case 'trust':
					newState = { ...newState, isTrustNa: info.isTrustNa, trustName: info.isTrustNa ? null : state.trustName };

					break;
				case 'cobuyer':
					newState = { ...newState, isCoBuyerNa: info.isCoBuyerNa };

					break;
			}

			return newState;
		case CommonActionTypes.ChangeOrdersUpdated:
			{
				let salesAgreementPrograms: Array<SalesAgreementProgram> = _.cloneDeep(state.programs) || [];
				let salesAgreementBuyers: Array<Buyer> = _.cloneDeep(state.buyers) || [];
				let trustName: string = _.cloneDeep(state.trustName) || null;

				action.changeOrders.forEach(changeOrder =>
				{
					if (changeOrder && changeOrder.salesStatusDescription === 'Approved')
					{
						let buyerCO = changeOrder.jobChangeOrders.find(t => t.jobChangeOrderTypeDescription === 'BuyerChangeOrder');

						if (buyerCO)
						{
							buyerCO.jobSalesChangeOrderBuyers.forEach(buyer =>
							{
								const existingBuyer = salesAgreementBuyers.findIndex(t => t.opportunityContactAssoc.id === buyer.opportunityContactAssoc.id);

								if (buyer.action === 'Add')
								{
									if (existingBuyer > -1)
									{
										salesAgreementBuyers.splice(existingBuyer, 1);
									}

									salesAgreementBuyers.push({
										id: buyer.id,
										isOriginalSigner: false,
										isPrimaryBuyer: buyer.isPrimaryBuyer,
										opportunityContactAssoc: buyer.opportunityContactAssoc,
										sortKey: buyer.sortKey
									});
								}
								else if (buyer.action === 'Delete')
								{
									if (existingBuyer > -1)
									{
										salesAgreementBuyers.splice(existingBuyer, 1);
									}
								}
							});

							let deletedTrust = buyerCO.jobSalesChangeOrderTrusts.find(t => t.action === 'Delete');
							let addedTrust = buyerCO.jobSalesChangeOrderTrusts.find(t => t.action === 'Add');

							if (addedTrust)
							{
								trustName = addedTrust.trustName;
							}
							else if (deletedTrust)
							{
								trustName = null;
							}
						}

						let priceAdjustmentCO = changeOrder.jobChangeOrders.find(t => t.jobChangeOrderTypeDescription === 'PriceAdjustment');

						if (priceAdjustmentCO)
						{
							priceAdjustmentCO.jobSalesChangeOrderSalesPrograms.forEach(program =>
							{
								if (program.action === 'Add')
								{
									const existingProgram = salesAgreementPrograms.findIndex(t => t.salesProgramId === program.salesProgramId);

									if (existingProgram > -1)
									{
										salesAgreementPrograms.splice(existingProgram, 1);
									}

									let salesProgram: ISalesProgram = {
										salesProgramType: program.salesProgramType
									};

									salesAgreementPrograms.push({
										id: program.id,
										amount: program.amount,
										salesProgramDescription: program.salesProgramDescription,
										salesProgramId: program.salesProgramId,
										salesProgram: salesProgram
									});
								}
								else if (program.action === 'Delete')
								{
									const existingProgram = salesAgreementPrograms.findIndex(t => t.salesProgramId === program.salesProgramId);

									if (existingProgram > -1)
									{
										salesAgreementPrograms.splice(existingProgram, 1);
									}
								}
							});
						}
					}
				});

				return { ...state, programs: salesAgreementPrograms, buyers: salesAgreementBuyers, trustName: trustName };
			}
		default:
			return state;
	}
}

//selectors
export const salesAgreementState = createFeatureSelector<State>('salesAgreement');

export const programs = createSelector(
	salesAgreementState,
	(state) => state.programs
);

export const primaryBuyer = createSelector(
	salesAgreementState,
	(state) => state && state.buyers ? state.buyers.find(b => b.isPrimaryBuyer) : null
);

export const originalSignersCount = createSelector(
	salesAgreementState,
	(state) => state && state.buyers ? state.buyers.filter(b => b.isOriginalSigner).length : 0
);

export const coBuyers = createSelector(
	salesAgreementState,
	(state) => state && state.buyers ? state.buyers.filter(b => !b.isPrimaryBuyer) : []
);

export const discount = createSelector(
	programs,
	(state) => state && state.length ? state.map(item => item.amount).reduce((prev, next) => prev + next) : 0
);

export const isDesignComplete = createSelector(
	salesAgreementState,
	(state) => state.isDesignComplete
);
