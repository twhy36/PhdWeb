using System.IO;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Azure.Storage;
using Microsoft.Azure.Storage.Blob;
using System.Threading.Tasks;
using System;

namespace AttributeCleanup
{
    class Program
    {
        private static IConfigurationRoot _configuration;
        private static ServiceProvider _services;

        static void Main(string[] args)
        {
			AttributeCleanup().Wait();
        }

		private static async Task AttributeCleanup()
		{
			// Setup configuration from appsettings.json
			var builder = new ConfigurationBuilder()
				.SetBasePath(Directory.GetCurrentDirectory())
				.AddJsonFile("appsettings.json", false, true);

			_configuration = builder.Build();

			var blobAccount = CloudStorageAccount.Parse(_configuration["AzureDocumentStorage"]);
			var blobClient = blobAccount.CreateCloudBlobClient();
			var container = blobClient.GetContainerReference("web-jobs");
			var blob = container.GetBlockBlobReference("attributecleanup.txt");

			if (!await blob.ExistsAsync())
			{
				await blob.UploadTextAsync(DateTime.MinValue.ToString());
			}

			string leaseId = null;

			try
			{
				leaseId = await blob.AcquireLeaseAsync(new TimeSpan(0, 0, 60));
			}
			catch
			{
				return;
			}

			var previousDateTime = DateTime.Parse(await blob.DownloadTextAsync());

			if (previousDateTime > DateTime.Now.AddMinutes(-30))
			{
				await blob.ReleaseLeaseAsync(new AccessCondition { LeaseId = leaseId });

				return;
			}

			try
			{
				var service = new ServiceCollection();

				service.AddSingleton(_configuration);
				service.AddHttpClient<EdhDeleteClient>();

				_services = service.BuildServiceProvider();

				// Clean up orphaned Locations and Attributes
				LocationGroupCleanup groupCleanup = new LocationGroupCleanup(_configuration, _services.GetRequiredService<EdhDeleteClient>());

				groupCleanup.Run().Wait();

				LocationCommunityCleanup locationCommunityCleanup = new LocationCommunityCleanup(_configuration, _services.GetRequiredService<EdhDeleteClient>());

				locationCommunityCleanup.Run().Wait();

				AttributeGroupCleanup attributeGroupCleanup = new AttributeGroupCleanup(_configuration, _services.GetRequiredService<EdhDeleteClient>());

				attributeGroupCleanup.Run().Wait();

				AttributeCommunityCleanup attributeCommunityCleanup = new AttributeCommunityCleanup(_configuration, _services.GetRequiredService<EdhDeleteClient>());

				attributeCommunityCleanup.Run().Wait();

				await blob.UploadTextAsync(DateTime.Now.ToString(), null, new AccessCondition { LeaseId = leaseId }, null, null);
			}
			catch (Exception ex)
			{
				Console.Out.WriteLine(ex.Message, ex.StackTrace);
			}
			finally
			{
				await blob.ReleaseLeaseAsync(new AccessCondition { LeaseId = leaseId });
			}
		}
    }
}
