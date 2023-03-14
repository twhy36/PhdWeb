import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';

@Injectable()
export class PresaleInterceptor implements HttpInterceptor
{
	constructor() { }

	intercept(req: HttpRequest<any>, next: HttpHandler)
	{
		if (!!sessionStorage.getItem('presale_token')) 
		{
			const token = encodeURIComponent(sessionStorage.getItem('presale_token'));
			const authReq = req.clone({
				headers: req.headers.set('Authorization', 'Presale ' + token)
			});
	
			return next.handle(authReq);
		}

		return next.handle(req);
	}
}
