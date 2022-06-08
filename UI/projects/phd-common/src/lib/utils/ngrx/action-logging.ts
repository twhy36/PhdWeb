import { Injectable } from '@angular/core';
import * as _ from 'lodash-es';

import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { Action } from '@ngrx/store';
import { Actions, createEffect } from '@ngrx/effects';
import { Observable } from 'rxjs';
import { tap, scan, filter } from 'rxjs/operators';

export function Log(includePayload: string[] | boolean = false, stopAt: string[] = null)
{
	if (stopAt)
	{
		return function <T extends { new(...args: any[]): {} }>(constructor: T)
		{
			return class extends constructor
			{
				logPayload = includePayload;
				timeUntil = stopAt;
			};
		}
	}
	else
	{
		return function <T extends { new(...args: any[]): {} }>(constructor: T)
		{
			return class extends constructor
			{
				logPayload = includePayload;
			};
		}
	}
}

@Injectable()
export class LoggingEffects
{
	logActions$: Observable<any> = createEffect(
		() => this.actions$.pipe(
			scan<Action, { action: Action, duration: boolean, timers: { action: Action, stopAt: string[] }[] }>((acc, curr) => 
			{
				let timers = acc.timers;

				if (curr.hasOwnProperty('timeUntil')) 
				{
					timers.push({ action: curr, stopAt: (<any>curr).timeUntil });
					this.appInsights.startTrackEvent(curr.type);
				}

				let matchedTimer = timers.findIndex(t => t.stopAt.some(a => a === curr.type));

				if (matchedTimer !== -1) 
				{
					const timer = timers.splice(matchedTimer, 1)[0];
					return { action: timer.action, duration: true, timers };
				}
				else 
				{
					return { action: curr, duration: false, timers };
				}
			}, { action: null, duration: false, timers: [] }),
			filter(acc => acc.action.hasOwnProperty('logPayload')),
			tap(acc => 
			{
				const logPayload: string[] | boolean = (<any>acc.action).logPayload;
				const trackFunction = acc.duration
					? this.appInsights.stopTrackEvent.bind(this.appInsights, acc.action.type)
					: this.appInsights.trackEvent.bind(this.appInsights, { name: acc.action.type });
				if (Array.isArray(logPayload)) 
				{
					trackFunction(_.pick(acc.action, logPayload));
				}
				else 
				{
					if (logPayload) 
					{
						trackFunction(_.omit(acc.action, 'type', 'logPayload', 'timeUntil'));
					}
					else 
					{
						trackFunction();
					}
				}
			})
		), { dispatch: false }
	);

	public constructor(
		private actions$: Actions,
		private appInsights: ApplicationInsights)
	{ }
}
