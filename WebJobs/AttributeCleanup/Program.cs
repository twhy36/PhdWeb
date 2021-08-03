using System.IO;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Threading.Tasks;
using System;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Specialized;
using Azure.Storage.Blobs.Models;

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

			var blob = new BlobClient(_configuration["AzureDocumentStorage"], "web-jobs", "attributecleanup.txt");

			if (!await blob.ExistsAsync())
			{
				using var ms = new MemoryStream();
				using var writer = new StreamWriter(ms);
				writer.WriteLine(DateTime.MinValue.ToString());
				await writer.FlushAsync();
				ms.Position = 0;
				await blob.UploadAsync(ms);
			}

			var lease = new BlobLeaseClient(blob);

			try
			{
				await lease.AcquireAsync(new TimeSpan(0, 0, 60));
			}
			catch
			{
				return;
			}

			using (var ms = new MemoryStream())
			{
				using var rdr = new StreamReader(ms);
				await blob.DownloadToAsync(ms);

				if (DateTime.TryParse(await rdr.ReadToEndAsync(), out DateTime previousDateTime) && previousDateTime > DateTime.Now.AddMinutes(-30))
				{
					await lease.ReleaseAsync();

					return;
				}
			}

			try
			{
				var service = new ServiceCollection();

				service.AddSingleton(_configuration);

				_services = service.BuildServiceProvider();

				// Clean up orphaned Locations and Attributes
				LocationGroupCleanup groupCleanup = new LocationGroupCleanup(_configuration);

				await groupCleanup.Run();

				LocationCommunityCleanup locationCommunityCleanup = new LocationCommunityCleanup(_configuration);

				await locationCommunityCleanup.Run();

				AttributeGroupCleanup attributeGroupCleanup = new AttributeGroupCleanup(_configuration);

				await attributeGroupCleanup.Run();

				AttributeCommunityCleanup attributeCommunityCleanup = new AttributeCommunityCleanup(_configuration);

				await attributeCommunityCleanup.Run();

				using var ms = new MemoryStream();
				using var writer = new StreamWriter(ms);
				await writer.WriteAsync(DateTime.Now.ToString());
				await writer.FlushAsync();
				await blob.UploadAsync(ms, conditions: new BlobRequestConditions { LeaseId = lease.LeaseId });
			}
			catch (Exception ex)
			{
				Console.Out.WriteLine(ex.Message, ex.StackTrace);
			}
			finally
			{
				await lease.ReleaseAsync();
			}
		}
    }
}
