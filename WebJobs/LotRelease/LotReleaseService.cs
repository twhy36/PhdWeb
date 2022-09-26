using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Phd.Jobs.Common;
using Pulte.Phd.Common.OAuth;
using Simple.OData.Client;
using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

namespace LotRelease
{
    internal class LotReleaseService : WebJobHostedService
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public LotReleaseService(IConfiguration configuration, IHttpClientFactory httpClientFactory, IHostApplicationLifetime applicationLifetime)
            : base(applicationLifetime, configuration)
        {
            _httpClientFactory = httpClientFactory;
        }

        protected override string LeaseBlobName => "lotrelease.txt";

        protected override async Task RunAsync()
        {
            Console.Out.WriteLine("Begin RunAsync()");
            try
            {
                OAuthConfig oAuthConfig = new OAuthConfig();
                _configuration.GetSection("AzureAD").Bind(oAuthConfig);

                Console.Out.WriteLine($@"After creating oAuthConfig - {oAuthConfig}");

                var tokenProvider = new OAuthTokenProvider(_httpClientFactory, oAuthConfig, _configuration["edhSettings:scope"]);
                Console.Out.WriteLine($@"After creating tokenProvider - {tokenProvider}");
                
                var edhToken = await tokenProvider.GetTokenAsync();
                Console.Out.WriteLine($@"After creating edhToken - {edhToken}");

                var phdClientSettings = new ODataClientSettings(new Uri(_configuration["phdSettings:url"]), new NetworkCredential(_configuration["phdSettings:user"], _configuration["phdSettings:password"]));
                phdClientSettings.BeforeRequest = rq =>
                {
                    rq.Headers.Add("Authorization", $"Basic {_configuration["phdSettings:apiKey"]}");
                };
                Console.Out.WriteLine($@"After creating phdClientSettings - {phdClientSettings}");

                var edhClientSettings = new ODataClientSettings(new Uri(_configuration["edhSettings:url"]));
                edhClientSettings.BeforeRequest = rq =>
                {
                    rq.Headers.Add("Authorization", $"Bearer {edhToken.AccessToken}");
                };
                Console.Out.WriteLine($@"After creating edhClientSettings - {edhClientSettings}");

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
                
                Console.Out.WriteLine("After assigning edhClientSettings and phdClientSettings");

                var _edhclient = new ODataClient(edhClientSettings);
                Console.Out.WriteLine($@"After creating _edhclient - {_edhclient}");                
                
                var _phdclient = new ODataClient(phdClientSettings);
                Console.Out.WriteLine($@"After creating _phdclient - {_phdclient}");

                //Go back x days in case the job did not finish successfully
                var today = DateTime.Now;
                var prevDate = DateTime.Today.AddDays(-1 * int.Parse(_configuration["general:nbrDaysBack"]));
                
                Console.Out.WriteLine($@"After creating prevDate - {prevDate}");

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
            }
            catch (Exception ex)
            {
                Console.Out.WriteLine(ex.Message, ex.StackTrace);
            }
            finally
            {
                Console.Out.Flush();
                Console.Error.Flush();
            }
        }
    }
}
