using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Phd.Jobs.Common;
using Pulte.Phd.Common.OAuth;
using System;
using System.Net.Http;
using System.Threading.Tasks;

namespace AttributeCleanup
{
    internal class AttributeCleanupService : WebJobHostedService
    {
		private readonly IHttpClientFactory _httpClientFactory;

		public AttributeCleanupService(IHostApplicationLifetime applicationLifetime, IConfiguration configuration, IHttpClientFactory httpClientFactory)
			: base(applicationLifetime, configuration)
		{ 
			_httpClientFactory = httpClientFactory;
		}

        protected override string LeaseBlobName => "attributecleanup.txt";


		protected override async Task RunAsync()
		{
			try
			{
				OAuthConfig oAuthConfig = new OAuthConfig();
				_configuration.GetSection("AzureAD").Bind(oAuthConfig);
				var tokenProvider = new OAuthTokenProvider(_httpClientFactory, oAuthConfig, _configuration["edhSettings:scope"]);
				var edhToken = await tokenProvider.GetTokenAsync();

				// Clean up orphaned Locations and Attributes
				LocationGroupCleanup groupCleanup = new LocationGroupCleanup(_configuration, edhToken.AccessToken);

				await groupCleanup.Run();

				LocationCommunityCleanup locationCommunityCleanup = new LocationCommunityCleanup(_configuration, edhToken.AccessToken);

				await locationCommunityCleanup.Run();

				AttributeGroupCleanup attributeGroupCleanup = new AttributeGroupCleanup(_configuration, edhToken.AccessToken);

				await attributeGroupCleanup.Run();

				AttributeCommunityCleanup attributeCommunityCleanup = new AttributeCommunityCleanup(_configuration, edhToken.AccessToken);

				await attributeCommunityCleanup.Run();

			}
			catch (Exception ex)
			{
				Console.Out.WriteLine(ex.Message, ex.StackTrace);
			}
		}
	}
}
