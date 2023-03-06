import { Observable } from 'rxjs';
import { AuthConfig } from 'angular-oauth2-oidc';

import { AuthService } from '../../core/services/auth.service';
import { BrandDisplayMode, BrandService } from '../../core/services/brand.service';

export class AuthConfigSelector extends Observable<AuthConfig> 
{
	constructor(private authService: AuthService, private brandService: BrandService)
	{
		super(subscriber => 
		{
			this.authService.getAuthConfig().subscribe(config => 
			{
				config.logoutUrl = this.brandService.getBrandName(BrandDisplayMode.LogoutUrl);
				subscriber.next(config);
				subscriber.complete();
			})
		});
	}
}