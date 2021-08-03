using System;
using Microsoft.Extensions.Configuration;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Simple.OData.Client;
using System.Net.Http;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Specialized;
using Azure.Storage.Blobs.Models;

namespace LotRelease
{
    class Program
    {
        static void Main(string[] args)
        {
            UpdateReleases().Wait();
        }

        private static async Task UpdateReleases()
        {
            IConfigurationRoot configuration;

            var builder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json");

            configuration = builder.Build();

            var blob = new BlobClient(configuration["AzureDocumentStorage"], "web-jobs", "lotrelease.txt");

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

            var phdClientSettings = new ODataClientSettings(new Uri(configuration["phdSettings:url"]), new NetworkCredential(configuration["phdSettings:user"], configuration["phdSettings:password"]));
            phdClientSettings.BeforeRequest = rq =>
            {
                rq.Headers.Add("Authorization", $"Basic {configuration["phdSettings:apiKey"]}");
            };

            var edhClientSettings = new ODataClientSettings(new Uri(configuration["edhSettings:url"]), new NetworkCredential(configuration["edhSettings:user"], configuration["edhSettings:password"]));
            edhClientSettings.BeforeRequest = rq =>
            {
                rq.Headers.Add("Authorization", $"Basic {configuration["edhSettings:apiKey"]}");
            };

            async Task logResponse(HttpResponseMessage rs)
            {
                try
                {
                    string requestBody = null;
                    if (rs.RequestMessage.Method == HttpMethod.Patch)
                    {
                        requestBody = await rs.RequestMessage.Content.ReadAsStringAsync();
                    }

                    Console.Out.WriteLine($@"{rs.RequestMessage.Method} {rs.RequestMessage.RequestUri.AbsolutePath}
    Request Path: {rs.RequestMessage.RequestUri.OriginalString}
    Response Status: {rs.StatusCode}
    Response Reason: {rs.ReasonPhrase}");
                    if (requestBody != null)
                    {
                        Console.Out.WriteLine($"\tRequest Body: {requestBody}");
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine(ex.ToString());
                }
            }
            
            edhClientSettings.AfterResponseAsync = logResponse;
            phdClientSettings.AfterResponseAsync = logResponse;

            var _edhclient = new ODataClient(edhClientSettings);
            var _phdclient = new ODataClient(phdClientSettings);

            //Go back x days in case the job did not finish successfully
            var today = DateTime.Now;
            var prevDate = DateTime.Today.AddDays(-1 * int.Parse(configuration["general:nbrDaysBack"]));

            try
            {
                var releases = await _phdclient.For<Release>()
                    .Expand(r => r.Release_LotAssoc)
                    .Filter(r => r.ReleaseDate >= prevDate && r.ReleaseDate <= DateTime.Now)
                    .FindEntriesAsync();
                var rel = releases.ToList();

                foreach (var p in rel)
                {
                    var idList = p.Release_LotAssoc.Select(l => l.EdhLotId).ToList();

                    if (idList.Any())
                    {
                        var filterLot = String.Join(" or ", idList.Select(x => "id eq " + x).ToArray());
                        filterLot = $"({filterLot}) and lotStatusDescription eq 'PendingRelease'";
                        var lots = await _edhclient.For<Lot>()
                            .Filter(filterLot)
                            .FindEntriesAsync();
                        var lotList = lots.ToList();

                        var batch = new ODataBatch(_edhclient);

                        foreach (var lot in lotList)
                        {
                            if (lot.LotStatusDescription == LotStatusEnum.PendingRelease)
                            {
                                lot.LotStatusDescription = LotStatusEnum.Available;
                                if (lot.LotBuildTypeDesc == null)
                                {
                                    lot.LotBuildTypeDesc = LotBuildTypeEnum.Dirt;
                                }
                                else if (lot.LotBuildTypeDesc == LotBuildTypeEnum.Model)
                                {
                                    lot.LotBuildTypeDesc = LotBuildTypeEnum.Spec;
                                }
                                lot.LastModifiedBy = "LotRelease";
                                lot.LastModifiedUtcDate = DateTime.UtcNow;

                                batch += c => c.For<Lot>()
                                    .Key(lot.Id)
                                    .Set(lot)
                                    .UpdateEntryAsync();
                            }
                        }

                        await batch.ExecuteAsync();
                    }
                }

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
                Console.Out.Flush();
                Console.Error.Flush();
            }
        }
    }
}

