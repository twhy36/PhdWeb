import { Injectable, Inject, forwardRef } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { flatMap } from 'rxjs/operators';
import { IdentityService } from '../services';


@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    constructor(@Inject(forwardRef(() => IdentityService)) private auth: IdentityService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler) {
		// Get the auth token from the service.
		return this.auth.token.pipe(
			flatMap(token => {
				// Clone the request and replace the original headers with
				// cloned headers, updated with the authorization.
				const authReq = req.clone({
					headers: req.headers.set('Authorization', 'Bearer ' + token)
				});

				return next.handle(authReq);
			})
		);
	}
}
