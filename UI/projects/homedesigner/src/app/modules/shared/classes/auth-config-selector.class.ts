import { Observable } from 'rxjs';
import { AuthConfig } from 'angular-oauth2-oidc';

import { AuthService } from '../../core/services/auth.service';

export class AuthConfigSelector extends Observable<AuthConfig> 
{
    constructor(private authService: AuthService)
    {
        super(subscriber => {
            this.authService.getAuthConfig().subscribe(config => {
                subscriber.next(config);
                subscriber.complete();
            })
        });
    }
}