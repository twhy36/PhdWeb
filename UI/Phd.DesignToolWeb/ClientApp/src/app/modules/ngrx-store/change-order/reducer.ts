import { createSelector, createFeatureSelector } from '@ngrx/store';
import * as _ from "lodash";

import { ChangeOrderGroup, ChangeInput, ChangeTypeEnum, ChangeOrder, ChangeOrderLot, SalesStatusEnum, ChangeOrderGroupSalesStatusHistory } from '../../shared/models/job-change-order.model';
import { isSalesChangeOrder } from '../../shared/models/sales-change-order.model';
import { Buyer } from '../../shared/models/buyer.model';
import { ChangeOrderActions, ChangeOrderActionTypes } from './actions';
import { Note } from '../../shared/models/note.model';
import { CommonActionTypes } from '../actions';
import { ESignStatusEnum } from '../../shared/models/esign-envelope.model';

export interface State
{
	isChangingOrder: boolean,
	loadingCurrentChangeOrder: boolean,
	loadError: boolean,
	savingChangeOrder: boolean,
	saveError: boolean,
	currentChangeOrder: ChangeOrderGroup,
	changeInput: ChangeInput
}

export const initialState: State = {
	isChangingOrder: false,
	loadingCurrentChangeOrder: false,
	loadError: false,
	savingChangeOrder: false,
	saveError: false,
	currentChangeOrder: null,
	changeInput: null
};

export function reducer(state: State = initialState, action: ChangeOrderActions): State
{
	switch (action.type)
	{
		case ChangeOrderActionTypes.SetChangingOrder:
			{
				let newChangeInput = _.cloneDeep(state.changeInput);
				let updatingChangeOrder = false;
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);

				const hasActiveChangeOrder = changeOrder &&
					changeOrder.jobChangeOrders &&
					changeOrder.jobChangeOrders.length &&
					changeOrder.jobChangeOrders[0].jobChangeOrderTypeDescription !== 'SalesJIO';

				if (action.cancel && hasActiveChangeOrder)
				{
					if (changeOrder.id)
					{
						updatingChangeOrder = true;
						newChangeInput.isDirty = false;

						if (action.handing)
						{
							newChangeInput.handing = action.handing;
						}
					}
					else
					{
						changeOrder = null;
					}
				}

				if (action.isChangingOrder && !state.isChangingOrder && !changeOrder.id)
				{
					changeOrder.salesStatusDescription = 'Pending';
					changeOrder.changeOrderGroupSequence = action.changeOrderGroupSequence;
				}

				return { ...state, isChangingOrder: updatingChangeOrder ? state.isChangingOrder : action.isChangingOrder, currentChangeOrder: changeOrder, changeInput: updatingChangeOrder ? newChangeInput : action.changeInput };
			}

		case CommonActionTypes.ESignEnvelopesLoaded:
			let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);

			if (action.jobChangeOrderEnvelopes && changeOrder)
			{
				action.jobChangeOrderEnvelopes.forEach(env =>
				{
					if (changeOrder.id === env.edhChangeOrderGroupId)
					{
						changeOrder.eSignEnvelopes = [...(changeOrder.eSignEnvelopes || []), env];
						changeOrder.envelopeId = env.envelopeGuid;
					}
				});
			}

			return { ...state, currentChangeOrder: changeOrder };

		case CommonActionTypes.ChangeOrderEnvelopeCreated:
			{
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);

				if (changeOrder)
				{
					if (changeOrder.eSignEnvelopes && changeOrder.eSignEnvelopes.some(e => e.eSignStatusId === ESignStatusEnum.Created))
					{
						let eSignEnvelopes = changeOrder.eSignEnvelopes.filter(e => e.eSignStatusId !== ESignStatusEnum.Created);

						changeOrder.eSignEnvelopes = [...(eSignEnvelopes || []), action.eSignEnvelope];
					}
					else
					{
						changeOrder.eSignEnvelopes = [...(changeOrder.eSignEnvelopes || []), action.eSignEnvelope];
					}

					changeOrder.envelopeId = action.eSignEnvelope.envelopeGuid;
				}

				return { ...state, currentChangeOrder: changeOrder, saveError: false };
			}

		case ChangeOrderActionTypes.CurrentChangeOrderLoaded:
		case CommonActionTypes.SalesAgreementLoaded:
		case CommonActionTypes.JobLoaded:
			{
				let isPendingChangeOrder = action.changeOrder && action.changeOrder.salesStatusDescription === 'Pending'
					// change orders don't apply unless sales agreement is approved
					&& (action.type === ChangeOrderActionTypes.CurrentChangeOrderLoaded
						|| !action.salesAgreement		// check pending CO in spec/model
						|| (action.salesAgreement && ['Pending', 'OutforSignature', 'Signed'].indexOf(action.salesAgreement.status) === -1)
					);
				let newInput = state.changeInput === null ? new ChangeInput() : _.cloneDeep(state.changeInput);
				let newCurrentChangeOrder = _.cloneDeep(action.changeOrder);

				if (isSalesChangeOrder(action.changeOrder))
				{
					if (action.changeOrder.salesStatusDescription === 'Pending')
					{
						newInput.type = ChangeTypeEnum.SALES;
					}
				}
				else
				{
					const nonSalesChangeOrders = action.changeOrder && action.changeOrder.jobChangeOrders
						? action.changeOrder.jobChangeOrders.filter(x => x.jobChangeOrderTypeDescription !== 'BuyerChangeOrder' && x.jobChangeOrderTypeDescription !== 'PriceAdjustment')
						: null;

					const lotTransferChangeOrder = nonSalesChangeOrders ? nonSalesChangeOrders.filter(x => x.jobChangeOrderTypeDescription === 'HomesiteTransfer') : null;

					if (lotTransferChangeOrder && lotTransferChangeOrder.length)
					{
						newInput.type = ChangeTypeEnum.LOT_TRANSFER;
					}
					else if (nonSalesChangeOrders && nonSalesChangeOrders.length)
					{
						switch (nonSalesChangeOrders[0].jobChangeOrderTypeDescription)
						{
							case 'NonStandard':
								newInput.type = ChangeTypeEnum.NON_STANDARD;
								break;
							case 'Plan':
								newInput.type = ChangeTypeEnum.PLAN;
								break;
							default:
								newInput.type = ChangeTypeEnum.CONSTRUCTION;
								break;
						}
					}

					isPendingChangeOrder = isPendingChangeOrder && nonSalesChangeOrders && nonSalesChangeOrders.length
						&& nonSalesChangeOrders[0].jobChangeOrderTypeDescription !== 'SalesJIO';

					if (isPendingChangeOrder) 
					{
						newInput.handing = action.handing;
					}
				}

				let newChangeOrder = {
					...state,
					currentChangeOrder: newCurrentChangeOrder,
					loadingCurrentChangeOrder: false,
					loadError: false,
					isChangingOrder: isPendingChangeOrder,
					changeInput: newInput
				};

				return newChangeOrder;
			}
		case ChangeOrderActionTypes.LoadError:
			return { ...state, loadingCurrentChangeOrder: false, loadError: true, currentChangeOrder: null };

		case ChangeOrderActionTypes.SetChangeOrderDescription:
			{
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);

				changeOrder.jobChangeOrderGroupDescription = action.changeOrderDescription;

				return { ...state, currentChangeOrder: changeOrder };
			}

		case ChangeOrderActionTypes.SetChangeOrderNote:
			{
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);

				if (!changeOrder.note)
				{
					changeOrder.note = new Note();
				}

				changeOrder.note.noteContent = action.changeOrderNote;

				return { ...state, currentChangeOrder: changeOrder };
			}

		case ChangeOrderActionTypes.SetChangeOrderOverrideNote:
			{
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);

				if (changeOrder.overrideNote !== action.overrideNote)
				{
					changeOrder.overrideNote = action.overrideNote;
				}

				return { ...state, currentChangeOrder: changeOrder };
			}

		case ChangeOrderActionTypes.ChangeInputInitialized:
			{
				return { ...state, changeInput: action.changeInput };
			}

		case ChangeOrderActionTypes.SetChangeOrderTrustName:
			{
				let newInput = _.cloneDeep(state.changeInput);

				newInput.trustName = action.trustName;
				newInput.isTrustNa = !action.trustName;
				newInput.isDirty = true;

				let newChangeOrder = { ...state.currentChangeOrder };

				return { ...state, changeInput: newInput, currentChangeOrder: newChangeOrder };
			}

		case ChangeOrderActionTypes.UpdateChangeOrderBuyer:
			{
				let newInput = _.cloneDeep(state.changeInput);
				let buyers = newInput.buyers as Array<Buyer>;

				const buyerIndex = buyers.findIndex(buyer => buyer.id === action.changeOrderBuyer.id);

				buyers.splice(buyerIndex, 1, action.changeOrderBuyer);

				newInput.isDirty = true;

				let newChangeOrder = { ...state.currentChangeOrder };

				return { ...state, changeInput: newInput, currentChangeOrder: newChangeOrder };
			}

		case ChangeOrderActionTypes.AddChangeOrderCoBuyer:
			{
				let newInput = _.cloneDeep(state.changeInput);
				let buyers = newInput.buyers as Array<Buyer>;
				let buyer = _.cloneDeep(action.changeOrderBuyer);

				buyer.id = -(buyers.filter(x => x.id < 0).length + 1);
				buyer.sortKey = buyers.length;

				if (buyer.opportunityContactAssoc.contact.addressAssocs)
				{
					buyer.opportunityContactAssoc.contact.addressAssocs.forEach(address =>
					{
						address.id = -(buyer.opportunityContactAssoc.contact.addressAssocs.filter(x => x.id < 0).length + 1);

						if (address.address)
						{
							address.address.id = address.id;
						}
					});
				}

				if (buyer.opportunityContactAssoc.contact.emailAssocs)
				{
					buyer.opportunityContactAssoc.contact.emailAssocs.forEach(email =>
					{
						email.id = -(buyer.opportunityContactAssoc.contact.emailAssocs.filter(x => x.id < 0).length + 1);

						if (email.email)
						{
							email.email.id = email.id;
						}
					});
				}

				if (buyer.opportunityContactAssoc.contact.phoneAssocs)
				{
					buyer.opportunityContactAssoc.contact.phoneAssocs.forEach(phone =>
					{
						phone.id = -(buyer.opportunityContactAssoc.contact.phoneAssocs.filter(x => x.id < 0).length + 1);

						if (phone.phone)
						{
							phone.phone.id = phone.id;
						}
					});
				}

				buyers.push(buyer as Buyer);

				newInput.isDirty = true;

				let newChangeOrder = { ...state.currentChangeOrder };

				return { ...state, changeInput: newInput, currentChangeOrder: newChangeOrder };
			}

		case ChangeOrderActionTypes.DeleteChangeOrderCoBuyer:
			{
				let newInput = _.cloneDeep(state.changeInput);
				let buyers = newInput.buyers as Array<Buyer>;

				const buyerIndex = buyers.findIndex(buyer => buyer.id === action.changeOrderBuyer.id);

				buyers.splice(buyerIndex, 1);

				newInput.isDirty = true;

				let newChangeOrder = { ...state.currentChangeOrder };

				return { ...state, changeInput: newInput, currentChangeOrder: newChangeOrder };
			}

		case ChangeOrderActionTypes.SwapChangeOrderPrimaryBuyer:
			{
				let newInput = _.cloneDeep(state.changeInput);
				let buyers = newInput.buyers as Array<Buyer>;

				let primaryBuyer = buyers.find(b => b.isPrimaryBuyer);
				let coBuyer = buyers.find(buyer => buyer.id === action.changeOrderBuyer.id);

				if (primaryBuyer)
				{
					primaryBuyer.isPrimaryBuyer = false;
					primaryBuyer.sortKey = coBuyer.sortKey;
				}

				if (coBuyer)
				{
					coBuyer.isPrimaryBuyer = true;
					coBuyer.sortKey = 0;
				}

				newInput.isDirty = true;

				let newChangeOrder = { ...state.currentChangeOrder };

				return { ...state, changeInput: newInput, currentChangeOrder: newChangeOrder };
			}

		case ChangeOrderActionTypes.ReSortChangeOrderBuyers:
			{
				let newInput = _.cloneDeep(state.changeInput);
				let buyers = newInput.buyers as Array<Buyer>;

				newInput.buyers = buyers.map<Buyer>(b =>
				{
					if (!b.isPrimaryBuyer)
					{
						if (b.sortKey === action.sourceSortKey)
						{
							return { ...b, sortKey: action.targetSortKey };
						}

						if (action.sourceSortKey > action.targetSortKey && b.sortKey >= action.targetSortKey && b.sortKey < action.sourceSortKey)
						{
							return { ...b, sortKey: ++b.sortKey };
						}

						if (action.sourceSortKey < action.targetSortKey && b.sortKey > action.sourceSortKey && b.sortKey <= action.targetSortKey)
						{
							return { ...b, sortKey: --b.sortKey };
						}
					}

					return { ...b };
				});

				newInput.isDirty = true;

				let newChangeOrder = { ...state.currentChangeOrder };

				return { ...state, changeInput: newInput, currentChangeOrder: newChangeOrder };
			}

		case ChangeOrderActionTypes.CreateJobChangeOrders:
			return { ...state, savingChangeOrder: true, saveError: false };

		case ChangeOrderActionTypes.ChangeOrdersCreated:
			{
				let newChangeInput = _.cloneDeep(state.changeInput);
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);

				if (action.changeOrders && action.changeOrders.length)
				{
					changeOrder = action.changeOrders.find(co => co.jobChangeOrders.some(c => c.jobChangeOrderTypeDescription === 'ChoiceAttribute'));

					if (!changeOrder)
					{
						changeOrder = { ...action.changeOrders[0] };
					}

					changeOrder = new ChangeOrderGroup(changeOrder);

					//keep existing envelope info
					if (state.currentChangeOrder)
					{
						changeOrder.envelopeId = state.currentChangeOrder.envelopeId;
						changeOrder.eSignEnvelopes = state.currentChangeOrder.eSignEnvelopes;
					}

					let buyerChangeOrderGroup = action.changeOrders.find(co => co.jobChangeOrders.some(c => c.jobChangeOrderTypeDescription === 'BuyerChangeOrder'));
					if (buyerChangeOrderGroup)
					{
						newChangeInput.buyers = buyerChangeOrderGroup.jobChangeOrders.find(co => co.jobChangeOrderTypeDescription === 'BuyerChangeOrder')
							.jobSalesChangeOrderBuyers;
					}
				}

				return { ...state, savingChangeOrder: false, saveError: false, currentChangeOrder: changeOrder, changeInput: newChangeInput };
			}

		case ChangeOrderActionTypes.SaveError:
			return { ...state, savingChangeOrder: false, saveError: true };

		case ChangeOrderActionTypes.SaveChangeOrderScenario:
			{
				let newInput = { ...state.changeInput };

				if (state.isChangingOrder && state.changeInput)
				{
					newInput.isDirty = true;
				}

				return { ...state, changeInput: newInput };
			}

		case ChangeOrderActionTypes.SetChangeOrderHanding:
			{
				let newInput = { ...state.changeInput };

				newInput.handing = action.handing;

				if (action.dirty)
				{
					newInput.isDirty = true;
				}

				return { ...state, changeInput: newInput };
			}

		case ChangeOrderActionTypes.CurrentChangeOrderCancelled:
			{
				return { ...state, currentChangeOrder: null };
			}

		case ChangeOrderActionTypes.CurrentChangeOrderOutForSignature:
			{
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);

				changeOrder.salesStatusDescription = 'OutforSignature';

				// add status history
				changeOrder.jobChangeOrderGroupSalesStatusHistories.push(new ChangeOrderGroupSalesStatusHistory({
					jobChangeOrderGroupId: changeOrder.id,
					salesStatusId: SalesStatusEnum.OutforSignature,
					createdUtcDate: action.statusUtcDate,
					salesStatusUtcDate: action.statusUtcDate
				}));

				return { ...state, currentChangeOrder: changeOrder };
			}

		case ChangeOrderActionTypes.CurrentChangeOrderSigned:
			{
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);

				changeOrder.salesStatusDescription = 'Signed';
				changeOrder.salesStatusUTCDate = action.statusUtcDate;

				// add status history
				if (!changeOrder.jobChangeOrderGroupSalesStatusHistories)
				{
					changeOrder.jobChangeOrderGroupSalesStatusHistories = [];
				}

				changeOrder.jobChangeOrderGroupSalesStatusHistories.push(new ChangeOrderGroupSalesStatusHistory({
					jobChangeOrderGroupId: changeOrder.id,
					salesStatusId: SalesStatusEnum.Signed,
					createdUtcDate: action.statusUtcDate,
					salesStatusUtcDate: action.statusUtcDate
				}));

				return { ...state, currentChangeOrder: changeOrder };
			}

		case ChangeOrderActionTypes.CurrentChangeOrderApproved:
			{
				return { ...state, currentChangeOrder: null };
			}

		case ChangeOrderActionTypes.CreateSalesChangeOrder:
			return { ...state, savingChangeOrder: true, saveError: false };

		case ChangeOrderActionTypes.SetSalesChangeOrderPriceAdjustments:
			{
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);
				let priceAdjustmentChangeOrder = changeOrder.jobChangeOrders ? changeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'PriceAdjustment') : null;

				if (!priceAdjustmentChangeOrder)
				{
					priceAdjustmentChangeOrder = new ChangeOrder();
					priceAdjustmentChangeOrder.id = 0;
					priceAdjustmentChangeOrder.jobChangeOrderTypeDescription = 'PriceAdjustment';

					if (!changeOrder.jobChangeOrders)
					{
						changeOrder.jobChangeOrders = new Array<ChangeOrder>();
					}

					changeOrder.jobChangeOrders.push(priceAdjustmentChangeOrder);
				}

				priceAdjustmentChangeOrder.jobSalesChangeOrderPriceAdjustments = action.salesChangeOrderPriceAdjustments.map(x =>
				{
					let priceAdjustmet = priceAdjustmentChangeOrder.jobSalesChangeOrderPriceAdjustments
						? priceAdjustmentChangeOrder.jobSalesChangeOrderPriceAdjustments.find(p => p.priceAdjustmentTypeName === x.priceAdjustmentTypeName)
						: null;

					return priceAdjustmet ? { ...priceAdjustmet, ...x } : x;
				});

				let newInput = _.cloneDeep(state.changeInput);

				if (state.isChangingOrder && state.changeInput)
				{
					newInput.isDirty = true;
				}

				return { ...state, currentChangeOrder: changeOrder, changeInput: newInput };
			}

		case ChangeOrderActionTypes.SetSalesChangeOrderSalesPrograms:
			{
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);
				let programAction = action.action;
				let salesAgreement = action.agreement;

				let priceAdjustmentChangeOrder = changeOrder.jobChangeOrders ? changeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'PriceAdjustment') : null;

				if (!priceAdjustmentChangeOrder)
				{
					priceAdjustmentChangeOrder = new ChangeOrder();
					priceAdjustmentChangeOrder.id = 0;
					priceAdjustmentChangeOrder.jobChangeOrderTypeDescription = 'PriceAdjustment';

					if (!changeOrder.jobChangeOrders)
					{
						changeOrder.jobChangeOrders = new Array<ChangeOrder>();
					}

					changeOrder.jobChangeOrders.push(priceAdjustmentChangeOrder);
				}

				if (!priceAdjustmentChangeOrder.jobSalesChangeOrderSalesPrograms)
				{
					priceAdjustmentChangeOrder.jobSalesChangeOrderSalesPrograms = [];
				}

				if (programAction === 'Add')
				{
					let salesChangeOrderSalesPrograms = _.cloneDeep(action.salesChangeOrderSalesPrograms);

					salesChangeOrderSalesPrograms.forEach(program =>
					{
						// try to see if the program has already been added
						const existingProgram = priceAdjustmentChangeOrder.jobSalesChangeOrderSalesPrograms.findIndex(x => x.salesProgramId === program.salesProgramId && x.action === program.action);
						const agreementProgram = salesAgreement.programs.find(x => x.salesProgramId === program.salesProgramId);
						if (existingProgram > -1)
						{
							program.amount = (agreementProgram && agreementProgram.amount ? agreementProgram.amount : 0) + program.amount;
							// replace the current incentive
							priceAdjustmentChangeOrder.jobSalesChangeOrderSalesPrograms.splice(existingProgram, 1, program);
						}
						else
						{
							let programAmount = program.amount;

							if (agreementProgram)
							{
								priceAdjustmentChangeOrder.jobSalesChangeOrderSalesPrograms.push({ salesProgramId: agreementProgram.salesProgramId, salesProgramDescription: agreementProgram.salesProgramDescription, amount: agreementProgram.amount, action: 'Delete', salesProgramType: agreementProgram.salesProgram.salesProgramType });

								programAmount += agreementProgram.amount;
							}

							program.amount = programAmount;

							// add incentive
							priceAdjustmentChangeOrder.jobSalesChangeOrderSalesPrograms.push(program);
						}
					});
				}
				else if (programAction === 'Delete')
				{
					let salesProgramId = action.salesChangeOrderSalesPrograms[0].salesProgramId;
					let programs = priceAdjustmentChangeOrder.jobSalesChangeOrderSalesPrograms.filter(p => p.salesProgramId === salesProgramId);

					programs.forEach(p =>
					{
						// try to see if the program has already been added
						const existingProgram = priceAdjustmentChangeOrder.jobSalesChangeOrderSalesPrograms.findIndex(x => x.salesProgramId === p.salesProgramId && x.action === p.action);

						if (existingProgram > -1)
						{
							// delete the incentive
							priceAdjustmentChangeOrder.jobSalesChangeOrderSalesPrograms.splice(existingProgram, 1);
						}
					});
				}

				let newInput = _.cloneDeep(state.changeInput);

				if (state.isChangingOrder && state.changeInput)
				{
					newInput.isDirty = true;
				}

				return { ...state, currentChangeOrder: changeOrder, changeInput: newInput };
			}

		case ChangeOrderActionTypes.DeleteSalesChangeOrderPriceAdjustment:
			{
				let newInput = _.cloneDeep(state.changeInput);
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);
				let priceAdjustmentChangeOrder = changeOrder.jobChangeOrders ? changeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'PriceAdjustment') : null;

				if (priceAdjustmentChangeOrder && priceAdjustmentChangeOrder.jobSalesChangeOrderPriceAdjustments)
				{
					priceAdjustmentChangeOrder.jobSalesChangeOrderPriceAdjustments = [];

					if (state.isChangingOrder && state.changeInput)
					{
						newInput.isDirty = true;
					}
				}

				return { ...state, currentChangeOrder: changeOrder, changeInput: newInput };
			}

		case ChangeOrderActionTypes.UpdateSalesChangeOrderPriceAdjustment:
			{
				let newInput = _.cloneDeep(state.changeInput);
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);
				let priceAdjustmentChangeOrder = changeOrder.jobChangeOrders ? changeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'PriceAdjustment') : null;

				if (priceAdjustmentChangeOrder
					&& priceAdjustmentChangeOrder.jobSalesChangeOrderPriceAdjustments
					&& priceAdjustmentChangeOrder.jobSalesChangeOrderPriceAdjustments.length > action.position)
				{
					let existingPriceAdjustment = priceAdjustmentChangeOrder.jobSalesChangeOrderPriceAdjustments[action.position];

					if (existingPriceAdjustment)
					{
						existingPriceAdjustment.amount = action.priceAdjustment ? action.priceAdjustment.amount : null;

						if (state.isChangingOrder && state.changeInput)
						{
							newInput.isDirty = true;
						}
					}
				}

				return { ...state, currentChangeOrder: changeOrder, changeInput: newInput };
			}

		case ChangeOrderActionTypes.CreateNonStandardChangeOrder:
			return { ...state, savingChangeOrder: true, saveError: false };

		case ChangeOrderActionTypes.CreatePlanChangeOrder:
			return { ...state, savingChangeOrder: true, saveError: false };

		case ChangeOrderActionTypes.CreateCancellationChangeOrder:
			return { ...state };

		case ChangeOrderActionTypes.SetChangeOrderLot:
			{
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);
				let lotTransferChangeOrder = changeOrder.jobChangeOrders ? changeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'HomesiteTransfer') : null;

				if (!lotTransferChangeOrder)
				{
					lotTransferChangeOrder = new ChangeOrder();
					lotTransferChangeOrder.id = 0;
					lotTransferChangeOrder.jobChangeOrderTypeDescription = 'HomesiteTransfer';

					if (!changeOrder.jobChangeOrders)
					{
						changeOrder.jobChangeOrders = new Array<ChangeOrder>();
					}

					changeOrder.jobChangeOrders.push(lotTransferChangeOrder);
				}

				if (!lotTransferChangeOrder.jobChangeOrderLots || !lotTransferChangeOrder.jobChangeOrderLots.length)
				{
					const changeOrderLot = new ChangeOrderLot();

					changeOrderLot.action = 'Add';

					lotTransferChangeOrder.jobChangeOrderLots = [changeOrderLot];
				}

				lotTransferChangeOrder.jobChangeOrderLots[0].lotId = action.lotId;

				let newInput = _.cloneDeep(state.changeInput);

				if (state.isChangingOrder && state.changeInput)
				{
					newInput.isDirty = true;
				}

				return { ...state, currentChangeOrder: changeOrder, changeInput: newInput };
			}

		case ChangeOrderActionTypes.SetChangeOrderRevertToDirt:
			{
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);
				let lotTransferChangeOrder = changeOrder.jobChangeOrders ? changeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'HomesiteTransfer') : null;

				if (lotTransferChangeOrder && lotTransferChangeOrder.jobChangeOrderLots && lotTransferChangeOrder.jobChangeOrderLots.length)
				{
					lotTransferChangeOrder.jobChangeOrderLots[0].revertToDirt = action.revertToDirt;
				}

				let newInput = _.cloneDeep(state.changeInput);

				if (state.isChangingOrder && state.changeInput)
				{
					newInput.isDirty = true;
				}

				return { ...state, currentChangeOrder: changeOrder, changeInput: newInput };
			}

		case CommonActionTypes.ChangeOrdersUpdated:
			{
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);
				const updatedChangeOrder = action.changeOrders.find(x => x.id === changeOrder.id);

				if (changeOrder && updatedChangeOrder)
				{
					switch (updatedChangeOrder.salesStatusDescription)
					{
						case 'Signed':
							changeOrder.salesStatusUTCDate = updatedChangeOrder.salesStatusUTCDate;
							changeOrder.jobChangeOrderGroupSalesStatusHistories.push(updatedChangeOrder.jobChangeOrderGroupSalesStatusHistories[0]);

							break;
						case 'OutforSignature':
							if (updatedChangeOrder.eSignEnvelopes)
							{
								changeOrder.eSignEnvelopes = updatedChangeOrder.eSignEnvelopes;
							}

							break;
						case 'Approved':
							changeOrder.constructionStatusDescription = updatedChangeOrder.constructionStatusDescription;

							break;
						case 'Withdrawn':
						case 'Rejected':
							changeOrder.jobChangeOrderGroupSalesStatusHistories.push(updatedChangeOrder.jobChangeOrderGroupSalesStatusHistories[0]);

							break;
					}

					changeOrder.salesStatusDescription = updatedChangeOrder.salesStatusDescription;
				}

				return { ...state, currentChangeOrder: changeOrder };
			}

		case ChangeOrderActionTypes.ResubmitChangeOrder:
			{
				let changeOrder = new ChangeOrderGroup();

				changeOrder.salesStatusDescription = 'Pending';
				changeOrder.changeOrderGroupSequence = action.sequence;
				changeOrder.changeOrderGroupSequenceSuffix = action.sequenceSuffix;

				return { ...state, isChangingOrder: true, currentChangeOrder: changeOrder, changeInput: action.changeInput };
			}

		case ChangeOrderActionTypes.SetChangeOrderNonStandardOptions:
			{
				let changeOrder = new ChangeOrderGroup(state.currentChangeOrder);
				let nonStandardChangeOrder = changeOrder.jobChangeOrders ? changeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'NonStandard') : null;

				if (!nonStandardChangeOrder)
				{
					nonStandardChangeOrder = new ChangeOrder();
					nonStandardChangeOrder.id = 0;
					nonStandardChangeOrder.jobChangeOrderTypeDescription = 'NonStandard';
					nonStandardChangeOrder.jobChangeOrderNonStandardOptions = [];

					if (!changeOrder.jobChangeOrders)
					{
						changeOrder.jobChangeOrders = new Array<ChangeOrder>();
					}

					changeOrder.jobChangeOrders.push(nonStandardChangeOrder);
				}

				let nonStandardOptions = [];

				if (action.changeOrderNonStandardOption.action === 'Add')
				{
					nonStandardOptions = nonStandardChangeOrder.jobChangeOrderNonStandardOptions.filter(t => t.action !== 'Add');
					nonStandardOptions.push(action.changeOrderNonStandardOption);
				}
				else if (action.changeOrderNonStandardOption.action === 'Delete')
				{
					nonStandardOptions = nonStandardChangeOrder.jobChangeOrderNonStandardOptions.filter(t => t.nonStandardOptionName !== action.changeOrderNonStandardOption.nonStandardOptionName);

					if (nonStandardOptions.length === nonStandardChangeOrder.jobChangeOrderNonStandardOptions.length)
					{
						nonStandardOptions.push(action.changeOrderNonStandardOption);
					}
				}

				nonStandardChangeOrder.jobChangeOrderNonStandardOptions = nonStandardOptions;

				return { ...state, currentChangeOrder: changeOrder };
			}

		case ChangeOrderActionTypes.SetChangeOrderPlanId:
			{
				let newInput = _.cloneDeep(state.changeInput);

				newInput.changeOrderPlanId = action.planId;

				return { ...state, changeInput: newInput };
			}

		default:
			return state;
	}
}

//selectors
export const changeOrderState = createFeatureSelector<State>('changeOrder');

export const currentChangeOrder = createSelector(
	changeOrderState,
	(state) => state ? state.currentChangeOrder : null
);

export const changeInput = createSelector(
	changeOrderState,
	(state) => state.changeInput
);

export const changeOrderBuyers = createSelector(
	changeOrderState,
	(state) => state && state.changeInput
		? state.changeInput.buyers
		: null
);

export const changeOrderPrimaryBuyer = createSelector(
	changeOrderState,
	(state) => state && state.changeInput && state.changeInput.buyers
		? state.changeInput.buyers.find(x => x.isPrimaryBuyer)
		: null
);

export const changeOrderCoBuyers = createSelector(
	changeOrderState,
	(state) => state && state.changeInput && state.changeInput.buyers
		? state.changeInput.buyers.filter(x => !x.isPrimaryBuyer)
		: []
);

export const isChangingOrder = createSelector(
	changeOrderState,
	(state) => state.isChangingOrder
);
