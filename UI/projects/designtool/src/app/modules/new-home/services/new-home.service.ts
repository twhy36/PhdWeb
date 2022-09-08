import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../ngrx-store/reducers';

import * as NavActions from '../../ngrx-store/nav/actions';

import { Choice, ChoiceRules, Job, LotChoiceRuleAssoc, LotChoiceRules, PointRules, PointStatus, Scenario, updateLotChoiceRules } from 'phd-common';
import { PhdSubMenu } from '../../new-home/subNavItems';

@Injectable()
export class NewHomeService
{
	constructor(private store: Store<fromRoot.State>)
	{

	}

	setSubNavItemsStatus(scenario: Scenario, buildMode: string, job: Job)
	{
		// 1: Name, 2: Plan, 3: Lot, 4: QMI

		let isScenarioNamed = buildMode === 'buyer' ? scenario.scenarioName.length > 0 : true;
		let isJob = job && job.id !== 0;
		let selectedPlanId = scenario.planId;
		let selectedLotId = scenario.lotId;

		// check if scenario name has already been entered
		this.setScenarioNameSubNavItemStatus(isScenarioNamed);

		this.setPlanSubNavItemStatus(selectedPlanId, isScenarioNamed, isJob);

		this.setLotSubNavItemStatus(selectedLotId, isScenarioNamed, isJob);

		this.setQMISubNavItemStatus(selectedPlanId, selectedLotId, isScenarioNamed, isJob);
	}

	private setScenarioNameSubNavItemStatus(isScenarioNamed: boolean)
	{
		let status = isScenarioNamed ? PointStatus.COMPLETED : PointStatus.REQUIRED;

		this.store.dispatch(new NavActions.SetSubNavItemStatus(PhdSubMenu.ConfigurationName, status));
	}

	private setPlanSubNavItemStatus(selectedPlanId: number, isScenarioNamed: boolean, isJob: boolean)
	{
		let status = PointStatus.CONFLICTED;

		if (isScenarioNamed)
		{
			if (isJob)
			{
				status = PointStatus.UNVIEWED;
			}
			else
			{
				status = selectedPlanId ? PointStatus.COMPLETED : PointStatus.REQUIRED;
			}
		}

		this.store.dispatch(new NavActions.SetSubNavItemStatus(PhdSubMenu.ChoosePlan, status));
	}

	private setLotSubNavItemStatus(selectedLotId: number, isScenarioNamed: boolean, isJob: boolean)
	{
		let status = PointStatus.CONFLICTED;

		if (isScenarioNamed)
		{
			if (isJob)
			{
				status = PointStatus.UNVIEWED;
			}
			else
			{
				status = selectedLotId ? PointStatus.COMPLETED : PointStatus.REQUIRED;
			}
		}

		this.store.dispatch(new NavActions.SetSubNavItemStatus(PhdSubMenu.ChooseLot, status));
	}

	private setQMISubNavItemStatus(selectedPlanId: number, selectedLotId: number, isScenarioNamed: boolean, isJob: boolean)
	{
		let status = PointStatus.CONFLICTED;

		if (isScenarioNamed)
		{
			if (isJob)
			{
				status = PointStatus.COMPLETED;
			}
			else
			{
				status = (selectedPlanId || selectedLotId) ? PointStatus.UNVIEWED : PointStatus.REQUIRED;
			}
		}

		this.store.dispatch(new NavActions.SetSubNavItemStatus(PhdSubMenu.QuickMoveIns, status));
	}

	compileLotChoiceRuleChanges(lotId: number, lotChoiceRuleAssoc: LotChoiceRuleAssoc[], lotChoiceRules: LotChoiceRules[], currentChoices: Choice[], choiceRules: ChoiceRules[], pointRules: PointRules[], scenarioPlanId: number, buildMode: any, scenario: Scenario)
	{
		let prevLotChoiceRules = lotChoiceRules;

		// Assign new lot choice rules everytime we select a lot
		// This assigns the most latest lot choice rules, instead of waiting for 1 hour
		lotChoiceRules = lotChoiceRuleAssoc?.length ? updateLotChoiceRules(lotChoiceRuleAssoc, lotChoiceRules) : [];

		// All must have lot choice rules on the current lot
		const mustHaveSelections = lotChoiceRules?.map((lcr) =>
		{
			return {
				...lcr, rules: lcr.rules.filter((rule) => rule.edhLotId === lotId
					&& (scenarioPlanId ? rule.planId === scenarioPlanId : true)
					&& rule.mustHave)
			};
		}).filter(r => r.rules.length);
		
		// All must not have lot choice rules on the current lot
		const mustNotHaveSelections = lotChoiceRules?.map((lcr) =>
		{
			return {
				...lcr, rules: lcr.rules.filter((rule) => rule.edhLotId === lotId
					&& (scenarioPlanId ? rule.planId === scenarioPlanId : true)
					&& !rule.mustHave)
			};
		}).filter(r => r.rules.length);

		// Fetch user selected choices disabled by rules, due to a choice bing disabled by lot choice rules
		var disabledByRules = new Array<Choice>();

		if (buildMode === 'spec' || buildMode === 'model')
		{
			// User selected lot choices that weren't required/disabled due to lot choice rules
			let prevUserSelectedChoices = currentChoices.filter(cc => !prevLotChoiceRules?.find(plc => plc.divChoiceCatalogId === cc.divChoiceCatalogId) && cc.quantity > 0);

			prevUserSelectedChoices.forEach(choice =>
			{
				// Fetch any user selected choices disabled by choice to choice rules due to a choice being disabled by lot choice rules
				const disabledByC2C = currentChoices.filter(cc => choiceRules.some(pr => pr.rules.some(rule => rule.choices.some(ch => ch === choice.id))
					&& cc.id === pr.choiceId
					&& cc.quantity > 0
					&& mustNotHaveSelections.some(ch => ch.divChoiceCatalogId === choice.divChoiceCatalogId)));

				// Fetch any user selected choices disabled by point to point rules due to a choice being disabled by lot choice rules
				const disabledByP2P = currentChoices.filter(cc => pointRules.some(pr => pr.rules.some(rule => rule.points.some(pt => pt === choice.treePointId))
					&& cc.treePointId === pr.pointId
					&& cc.quantity > 0
					&& mustNotHaveSelections.some(ch => ch.divChoiceCatalogId === choice.divChoiceCatalogId)));

				// Fetch any user selected choices disabled by point to choice rules due to a choice being disabled by lot choice rules
				const disabledByP2C = currentChoices.filter(cc => pointRules.some(pr => pr.rules.some(rule => rule.choices.some(ch => ch === choice.id))
					&& cc.treePointId === pr.pointId
					&& cc.quantity > 0
					&& mustNotHaveSelections.some(ch => ch.divChoiceCatalogId === choice.divChoiceCatalogId)));

				disabledByRules = [...disabledByRules, ...disabledByC2C, ...disabledByP2P, ...disabledByP2C];
			});
		}
		else
		{
			// User selected lot choices that weren't required/disabled due to lot choice rules
			let prevUserSelectedChoices = scenario.scenarioChoices?.filter(sc => !prevLotChoiceRules?.find(plc => plc.divChoiceCatalogId === sc.choice.choiceCatalogId));

			prevUserSelectedChoices.forEach(choice =>
			{
				// Fetch choices disabled by choice to choice rules
				const disabledByC2C = currentChoices.filter(cc => choiceRules.some(pr => pr.rules.some(rule => rule.choices.some(ch => ch === choice.choiceId))
					&& cc.id === pr.choiceId
					&& cc.quantity > 0
					&& mustNotHaveSelections.some(ch => ch.divChoiceCatalogId === choice.choice.choiceCatalogId)));

				// Fetch choices disabled by point to point rules
				const disabledByP2P = currentChoices.filter(cc => pointRules.some(pr => pr.rules.some(rule => rule.points.some(pt => pt === choice.treePointId))
					&& cc.treePointId === pr.pointId
					&& cc.quantity > 0
					&& mustNotHaveSelections.some(ch => ch.divChoiceCatalogId === choice.choice.choiceCatalogId)));

				// Fetch choices disabled by point to choice rules
				const disabledByP2C = currentChoices.filter(cc => pointRules.some(pr => pr.rules.some(rule => rule.choices.some(ch => ch === choice.choiceId))
					&& cc.treePointId === pr.pointId
					&& cc.quantity > 0
					&& mustNotHaveSelections.some(ch => ch.divChoiceCatalogId === choice.choice.choiceCatalogId)));

				disabledByRules = [...disabledByRules, ...disabledByC2C, ...disabledByP2P, ...disabledByP2C];
			});
		}

		// All previously required lot choice rules that are not required on the current lot + aren't disabled on the new lot + aren't disabled by rules
		const noLongerRequiredSelections = prevLotChoiceRules?.map((lcr) =>
		{
			return {
				...lcr, rules: lcr.rules.filter((rule) => rule.mustHave
					&& (scenarioPlanId ? rule.planId === scenarioPlanId : true)
					&& !mustHaveSelections.some(mh => mh.divChoiceCatalogId === lcr.divChoiceCatalogId)
					&& !mustNotHaveSelections.some(mnh => mnh.divChoiceCatalogId === lcr.divChoiceCatalogId)
					&& !disabledByRules.some(dr => dr.divChoiceCatalogId === lcr.divChoiceCatalogId)
				)
			}
		}).filter(r => r.rules.length);

		return { prevLotChoiceRules, lotChoiceRules, mustHaveSelections, disabledByRules, mustNotHaveSelections, noLongerRequiredSelections };
	}

	createLotChoiceRuleChangeMessageBody(lotBlock: string, currentChoices: Choice[], mustHaveSelections: any, mustNotHaveSelections: any, disabledByRules: any, noLongerRequiredSelections: any)
	{
		const sectionBody = (bodyText) => `<div class="phd-lot-choice-rule-msg-body">${bodyText}</div>`;
		const choiceText = (label) => `Choice - ${label} <br />`;
		const buildSection = (sectionArray: any, checkForChoice: boolean = true) =>
		{
			let choiceLabels = '';

			sectionArray?.forEach(item =>
			{
				if (checkForChoice)
				{
					let foundChoice = currentChoices.find(cc => cc.divChoiceCatalogId === item.divChoiceCatalogId);

					if (foundChoice)
					{
						choiceLabels += choiceText(foundChoice.label);
					}
				}
				else
				{
					choiceLabels = choiceText(item.label);
				}
			});

			return choiceLabels.length ? sectionBody(choiceLabels) : '';
		};

		let body = '';

		let mustHaveSection = buildSection(mustHaveSelections);
		let mustNotHaveSection = buildSection(mustNotHaveSelections);
		let disabledByRulesSection = buildSection(disabledByRules, false);
		let noLongerRequiredSelectionsSection = buildSection(noLongerRequiredSelections);
				
		if (mustHaveSection.length)
		{
			body += `<b>Lot ${lotBlock} has the following requirement(s) which will be systematially selected if you continue: </b><br />`;
			body += mustHaveSection;
		}
		
		if (mustNotHaveSection.length)
		{
			body += body.length ? '<br />' : '';

			body += `<b>Lot ${lotBlock} has the following choice restriction(s) which will be unavailable for selection if you continue. Please review the impacted decision point(s) to determine if a new choice selection is necessary:</b><br />`;
			body += mustNotHaveSection;
		}

		if (disabledByRulesSection.length)
		{
			body += body.length ? '<br />' : '';

			body += `<b>The following choice(s) will be deselected based on the choice restriction(s) above. Please review the impacted decision point(s) to determine if a new choice selection is necessary</b><br />`;
			body += disabledByRulesSection;
		}

		if (noLongerRequiredSelectionsSection.length)
		{
			body += body.length ? '<br />' : '';

			body += `<b>The following choice(s) will no longer be required for Lot ${lotBlock}. You will be able to modify the choice(s) if you continue: </b><br />`;
			body += noLongerRequiredSelectionsSection;
		}

		return body;
	}
}
