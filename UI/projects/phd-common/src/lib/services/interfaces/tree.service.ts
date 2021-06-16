import { Observable } from 'rxjs';
import { JobPlanOption, ChangeOrderPlanOption, PlanOptionCommunityImageAssoc, OptionRule } from 'phd-common';

export interface ITreeService {
	getChoiceDetails(choices: Array<number>): Observable<Array<any>>;

	getPlanOptionCommunityImageAssoc(options: Array<JobPlanOption | ChangeOrderPlanOption>): Observable<Array<PlanOptionCommunityImageAssoc>>;

	getHistoricOptionMapping(options: Array<{ optionNumber: string; dpChoiceId: number }>): Observable<{ [optionNumber: string]: OptionRule }>;
}