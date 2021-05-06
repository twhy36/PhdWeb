import { Injectable } from '@angular/core';

import { from, timer, of, Subscription } from 'rxjs';
import { tap, retryWhen, delayWhen, take, switchMap } from 'rxjs/operators';

import * as signalR from '@aspnet/signalr';

import { environment } from '../../../../environments/environment';


@Injectable()
export class NotificationService {
	private connection: signalR.HubConnection;
	private reOrgSub: Subscription;

	constructor() { }

	public init(): void
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
		};

		connectObs.subscribe(initializeSubscriptions);

		this.connection.onclose(err =>
		{
			this.reOrgSub.unsubscribe();

			console.error(err);
		});
	}

	public registerHandlers(): void
	{
		this.connection.on("ReOrgCompleted", () =>
		{
			console.log('Completed');
			// Update UI
		});
	}
}

