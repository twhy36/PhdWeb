import { Injectable, Inject, forwardRef } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { OAuthStorage, OAuthModuleConfig } from 'angular-oauth2-oidc';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

	constructor(@Inject(forwardRef(() => OAuthStorage)) private authStorage: OAuthStorage) { }

    intercept(req: HttpRequest<any>, next: HttpHandler) {
		const authReq = req.clone({
			headers: req.headers.set('Authorization', 'Bearer ' + this.authStorage.getItem('id_token'))
		});

		return next.handle(authReq);
	}
}
