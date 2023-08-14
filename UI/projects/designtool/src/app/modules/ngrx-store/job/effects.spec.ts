import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, from } from 'rxjs';
import { SalesAgreementLoaded, ScenarioLoaded } from '../actions';
import { SetPermissions } from '../user/actions';
import { SalesAgreement, JobPlanOption, Constants } from 'phd-common';
import { JobEffects } from './effects';
import { mock } from 'ts-mockito';
import { JobService } from '../../core/services/job.service';
import { State } from '../reducers';
import { JobPlanOptionsUpdated } from './actions';
import { LiteService } from '../../core/services/lite.service';

function getDefaultState()
{
	return {
		job: {
			jobTypeName: 'Spec',
			jobPlanOptions: [
				{ planOptionId: 1, listPrice: 100 }
			],
			lotId: 5
		},
		scenario: {
			options: [
				{ id: 1, listPrice: 200 }
			]
		},
		user: {
			canSell: true
		}
	};
}

describe('JobEffects', () =>
{
	describe('updateSpecJobPricing', () =>
	{
		it('shouldn\'t save if user doesn\'t have permissions', () =>
		{
			const state = getDefaultState();
			const store = of({ ...state, user: { ...state.user, canSell: false } }) as Store<State>;
			const actions = new Actions(
				from([
					new ScenarioLoaded(null, null, null, null, null, null, null, false, null, [], null, null),
					new SetPermissions(null, [], 1)
				])
			);
			const jobService = mock(JobService);
			spyOn(jobService, 'updateSpecJobPricing');

			const liteService = mock(LiteService);
			spyOn(liteService, 'checkLiteAgreement').and.returnValue(false);

			const jobEffect = new JobEffects(actions, store, null, jobService, null, null, null, liteService);
			jobEffect.updateSpecJobPricing$.subscribe();

			expect(jobService.updateSpecJobPricing).toHaveBeenCalledTimes(0);
		});

		it('shouldn\'t save if jobtype isn\'t spec or model', () =>
		{
			const state = getDefaultState();
			const store = of({ ...state, job: { ...state.job, jobTypeName: 'House' } }) as Store<State>;
			const actions = new Actions(
				from([
					new ScenarioLoaded(null, null, null, null, null, null, null, false, null, [], null, null),
					new SetPermissions(null, [], 1)
				])
			);
			const jobService = mock(JobService);
			spyOn(jobService, 'updateSpecJobPricing');

			const liteService = mock(LiteService);
			spyOn(liteService, 'checkLiteAgreement').and.returnValue(false);			

			const jobEffect = new JobEffects(actions, store, null, jobService, null, null, null, liteService);
			jobEffect.updateSpecJobPricing$.subscribe();

			expect(jobService.updateSpecJobPricing).toHaveBeenCalledTimes(0);
		});

		it('shouldn\'t save if sales agreement is out for signature', () =>
		{
			const state = getDefaultState();
			const store = of(state) as Store<State>;
			const actions = new Actions(
				from([
					new SalesAgreementLoaded(<SalesAgreement>{ status: Constants.AGREEMENT_STATUS_OUT_FOR_SIGNATURE }, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
					new SetPermissions(null, [], 1)
				])
			);
			const jobService = mock(JobService);
			spyOn(jobService, 'updateSpecJobPricing');

			const liteService = mock(LiteService);
			spyOn(liteService, 'checkLiteAgreement').and.returnValue(false);

			const jobEffect = new JobEffects(actions, store, null, jobService, null, null, null, liteService);
			jobEffect.updateSpecJobPricing$.subscribe();

			expect(jobService.updateSpecJobPricing).toHaveBeenCalledTimes(0);
		});

		it('shouldn\'t save if option prices are in sync', () =>
		{
			const state = getDefaultState();
			const store = of({ ...state, job: { ...state.job, jobPlanOptions: [{ ...state.job.jobPlanOptions[0], listPrice: 200 }] } }) as Store<State>;
			const actions = new Actions(
				from([
					new ScenarioLoaded(null, null, null, null, null, null, null, false, null, [], null, null),
					new SetPermissions(null, [], 1)
				])
			);
			const jobService = mock(JobService);
			spyOn(jobService, 'updateSpecJobPricing');

			const liteService = mock(LiteService);
			spyOn(liteService, 'checkLiteAgreement').and.returnValue(false);	

			const jobEffect = new JobEffects(actions, store, null, jobService, null, null, null, liteService);
			jobEffect.updateSpecJobPricing$.subscribe();

			expect(jobService.updateSpecJobPricing).toHaveBeenCalledTimes(0);
		});

		it('should save if job type is spec', () =>
		{
			const state = getDefaultState();
			const store = of(state) as Store<State>;
			const actions = new Actions(
				from([
					new ScenarioLoaded(null, null, null, null, null, null, null, false, null, [], null, null),
					new SetPermissions(null, [], 1)
				])
			);
			const jobService = mock(JobService);
			spyOn(jobService, 'updateSpecJobPricing').and.returnValue(of([<JobPlanOption>{ id: 10 }]));

			const liteService = mock(LiteService);
			spyOn(liteService, 'checkLiteAgreement').and.returnValue(false);	

			const jobEffect = new JobEffects(actions, store, null, jobService, null, null, null, liteService);
			jobEffect.updateSpecJobPricing$.subscribe(result =>
			{
				expect(result).toBeInstanceOf(JobPlanOptionsUpdated);
				expect((<JobPlanOptionsUpdated>result).jobPlanOptions[0].id).toEqual(10);
			});

			expect(jobService.updateSpecJobPricing).toHaveBeenCalledWith(5);
		});

		it('should save if job type is model', () =>
		{
			const state = getDefaultState();
			const store = of({ ...state, job: { ...state.job, jobTypeName: 'Model' } }) as Store<State>;
			const actions = new Actions(
				from([
					new ScenarioLoaded(null, null, null, null, null, null, null, false, null, [], null, null),
					new SetPermissions(null, [], 1)
				])
			);
			const jobService = mock(JobService);
			spyOn(jobService, 'updateSpecJobPricing').and.returnValue(of([<JobPlanOption>{ id: 10 }]));

			const liteService = mock(LiteService);
			spyOn(liteService, 'checkLiteAgreement').and.returnValue(false);

			const jobEffect = new JobEffects(actions, store, null, jobService, null, null, null, liteService);
			jobEffect.updateSpecJobPricing$.subscribe(result =>
			{
				expect(result).toBeInstanceOf(JobPlanOptionsUpdated);
				expect((<JobPlanOptionsUpdated>result).jobPlanOptions[0].id).toEqual(10);
			});

			expect(jobService.updateSpecJobPricing).toHaveBeenCalledWith(5);
		});

		it('should save if sales agreement is out for signature', () =>
		{
			const state = getDefaultState();
			const store = of(state) as Store<State>;
			const actions = new Actions(
				from([
					new SalesAgreementLoaded(<SalesAgreement>{ status: Constants.AGREEMENT_STATUS_PENDING }, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
					new SetPermissions(null, [], 1)
				])
			);
			const jobService = mock(JobService);
			spyOn(jobService, 'updateSpecJobPricing').and.returnValue(of([<JobPlanOption>{ id: 10 }]));

			const liteService = mock(LiteService);
			spyOn(liteService, 'checkLiteAgreement').and.returnValue(false);			

			const jobEffect = new JobEffects(actions, store, null, jobService, null, null, null, liteService);
			jobEffect.updateSpecJobPricing$.subscribe(result =>
			{
				expect(result).toBeInstanceOf(JobPlanOptionsUpdated);
				expect((<JobPlanOptionsUpdated>result).jobPlanOptions[0].id).toEqual(10);
			});

			expect(jobService.updateSpecJobPricing).toHaveBeenCalledWith(5);
		});
	});
});
