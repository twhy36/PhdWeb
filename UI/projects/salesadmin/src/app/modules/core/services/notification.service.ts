import { ReOrgService } from '../services/re-org.service';
import { Injectable } from '@angular/core';

import { from, timer, of, Subscription, Observable } from 'rxjs';
import { tap, retryWhen, delayWhen, take, switchMap } from 'rxjs/operators';

import * as signalR from '@microsoft/signalr';

import { environment } from '../../../../environments/environment';

@Injectable()
export class NotificationService
{
	private connection: signalR.HubConnection;

	constructor(private _reOrgService: ReOrgService) { }

	public init(): Observable<void>
	{
		return new Observable(subscriber =>
		{
			this.connection = new signalR.HubConnectionBuilder()
				.withUrl(environment.hubUrl)
				.build();

			let connectObs = of(null).pipe(
				switchMap(() => from(this.connection.start())),
				retryWhen(errors => errors.pipe(
					take(5),
					tap(err => console.error(err)),
					delayWhen((_err, count) => timer(1000 * (2 ** count))) //exponential retry time
				))
			);

			const initializeSubscriptions = () =>
			{
				console.log('Sending connection');

				this.connection.send("TrackReOrgCommunity");
				subscriber.next();
			};

			connectObs.subscribe(initializeSubscriptions,
				err => subscriber.error(err),
				() => subscriber.complete());
		})
	}

	public registerHandlers(): void
	{
		this.connection.on("reOrgCompleted", (isComplete: boolean) =>
		{
			if (isComplete)
			{
				console.log('Completed w/o errors');
				this._reOrgService.updateReOrgsFlag();
			}

			this.connection.stop();
		});
	}
}

