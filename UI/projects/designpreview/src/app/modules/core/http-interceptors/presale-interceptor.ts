import { Injectable, Inject, forwardRef } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { OAuthStorage } from 'angular-oauth2-oidc';

@Injectable()
export class PresaleInterceptor implements HttpInterceptor
{
	constructor(@Inject(forwardRef(() => OAuthStorage)) private authStorage: OAuthStorage) { }

	intercept(req: HttpRequest<any>, next: HttpHandler)
	{
		if (!!sessionStorage.getItem('presale_token')) {
			const token = encodeURIComponent(sessionStorage.getItem('presale_token'));
			const authReq = req.clone({
				headers: req.headers.set('Authorization', 'Presale ' + token)
			});
	
			return next.handle(authReq);
		}

		return next.handle(req);
	}
}
