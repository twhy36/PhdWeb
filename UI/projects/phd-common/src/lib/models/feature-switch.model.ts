import { IOrg } from './org.model';

export interface IFeatureSwitch
{
	featureSwitchId: number;
	name: string;
	description: string;
	state: boolean;
	featureSwitchOrgAssocs: IFeatureSwitchOrgAssoc[];
}

export interface IFeatureSwitchOrgAssoc
{
	featureSwitchId: number;
	orgID: number;
	state: boolean;
	org: IOrg
}
